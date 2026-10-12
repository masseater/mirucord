import { Resource, Stack, Stage, makeRandom } from "alchemy";
import {
  CloudflareEnvironment,
  Credentials,
  D1,
  Queues,
  SecretsStore,
  Vectorize,
  Website,
  Workers,
  providers,
  state,
} from "alchemy/Cloudflare";
import type { InferEnv } from "alchemy/Cloudflare";
import { succeed as succeedProvider } from "alchemy/Provider";
import { Boolean, Config, Effect, Layer, Match, Option, Redacted, Schema } from "effect";
import type { Context } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClientError } from "effect/http";

import type { GuildStore } from "./src/entities/guild-message/api/guild-store.server.ts";
import { INGEST_MAX_RETRIES, POLL_CRON, SYNC_CRON } from "./src/features/ingest/index.ts";
import { FREE_GUILD_LIMIT } from "./src/shared/config/plan.ts";
import { SITE_HOST } from "./src/shared/config/site.ts";

const EMBEDDING_DIMENSIONS = 1024;
const NAME_PREFIX = "mirucord";
const PRODUCTION_STAGE = "prod";
const NOT_FOUND = 404;
const DEFAULT_MAX_GUILDS = String(FREE_GUILD_LIMIT);
const WORKER_ISSUES = "Mirucord.WorkerIssues";
const NonEmptySecret = Schema.Redacted(Schema.NonEmptyString);

const discordEnv = Config.all({
  DISCORD_CLIENT_ID: Config.NonEmptyString("DISCORD_CLIENT_ID"),
  DISCORD_CLIENT_SECRET: Config.schema(NonEmptySecret, "DISCORD_CLIENT_SECRET"),
  DISCORD_BOT_TOKEN: Config.schema(NonEmptySecret, "DISCORD_BOT_TOKEN"),
});

const operationsEnv = Config.all({
  MAX_GUILDS: Config.String("MAX_GUILDS").pipe(Config.withDefault(DEFAULT_MAX_GUILDS)),
  alertWebhook: Config.option(Config.schema(NonEmptySecret, "ALERT_WEBHOOK_URL")),
}).pipe(
  Config.map(({ alertWebhook, ...limits }) => ({
    ...limits,
    ...Option.match(alertWebhook, {
      onNone: () => ({}),
      onSome: (ALERT_WEBHOOK_URL) => ({ ALERT_WEBHOOK_URL }),
    }),
  })),
);

type WorkerIssuesResource = Resource<
  typeof WORKER_ISSUES,
  Readonly<{ workerName: string; deployment: Effect.Success<typeof web>["hash"] }>,
  Readonly<{ accountId: string; workerName: string }>
>;

const WorkerIssues = Resource<WorkerIssuesResource>(WORKER_ISSUES);

type CloudflareCredentials = Effect.Success<Context.Service.Shape<typeof Credentials>>;
type CredentialsError = Effect.Error<Context.Service.Shape<typeof Credentials>>;
type ScriptSettingsCall<Value> = Effect.Effect<
  Value,
  HttpClientError.HttpClientError | Schema.SchemaError | CredentialsError,
  CloudflareEnvironment | Credentials | HttpClient.HttpClient
>;

const authHeaders = Match.type<CloudflareCredentials>().pipe(
  Match.discriminatorsExhaustive("type")({
    apiKey: ({ apiKey, email }) => ({
      "X-Auth-Key": Redacted.value(apiKey),
      "X-Auth-Email": email,
    }),
    apiToken: ({ apiToken }) => ({ Authorization: `Bearer ${Redacted.value(apiToken)}` }),
    oauth: ({ accessToken }) => ({ Authorization: `Bearer ${Redacted.value(accessToken)}` }),
  }),
);

const IssuesSetting = Schema.NullOr(Schema.Struct({ enabled: Schema.Boolean }));

const Observability = Schema.StructWithRest(
  Schema.Struct({ issues: Schema.optional(IssuesSetting) }),
  [Schema.Record(Schema.String, Schema.Unknown)],
);

const ObservabilitySetting = Schema.optional(Schema.NullOr(Observability));

const ScriptSettings = Schema.Struct({
  result: Schema.Struct({ observability: ObservabilitySetting }),
});

type ObservedObservability = typeof Observability.Type;

const issuesEnabled = ({ issues }: ObservedObservability): boolean =>
  Option.fromNullishOr(issues).pipe(Option.exists(({ enabled }) => enabled));

const scriptSettingsTarget = Effect.fn("scriptSettingsTarget")(function* scriptSettingsTarget(
  workerName: string,
) {
  const { accountId } = yield* yield* CloudflareEnvironment;
  const credentials = yield* yield* Credentials;
  const script = encodeURIComponent(workerName);
  return {
    url: `${credentials.apiBaseUrl}/accounts/${accountId}/workers/scripts/${script}/script-settings`,
    headers: authHeaders(credentials),
  };
});

const sendScriptSettings = Effect.fn("sendScriptSettings")(function* sendScriptSettings(
  workerName: string,
  build: (url: string) => HttpClientRequest.HttpClientRequest,
) {
  const { url, headers } = yield* scriptSettingsTarget(workerName);
  const client = yield* HttpClient.HttpClient;
  return yield* client.execute(build(url).pipe(HttpClientRequest.setHeaders(headers)));
});

const observeScriptSettings = (
  workerName: string,
): ScriptSettingsCall<Option.Option<ObservedObservability>> =>
  sendScriptSettings(workerName, HttpClientRequest.get).pipe(
    Effect.flatMap((response) =>
      Match.value(response.status).pipe(
        Match.when(NOT_FOUND, () => Effect.succeedNone),
        Match.orElse(() =>
          HttpClientResponse.filterStatusOk(response).pipe(
            Effect.flatMap(HttpClientResponse.schemaBodyJson(ScriptSettings)),
            Effect.map(({ result }) => result.observability ?? {}),
            Effect.asSome,
          ),
        ),
      ),
    ),
  );

const patchIssues = (
  workerName: string,
  observability: ObservedObservability,
  enabled: boolean,
): ScriptSettingsCall<void> =>
  sendScriptSettings(workerName, (url) =>
    HttpClientRequest.patch(url).pipe(
      HttpClientRequest.bodyJsonUnsafe({
        observability: { ...observability, issues: { enabled } },
      }),
    ),
  ).pipe(Effect.flatMap(HttpClientResponse.filterStatusOk), Effect.asVoid);

const setWorkerIssues = (workerName: string, enabled: boolean): ScriptSettingsCall<void> =>
  observeScriptSettings(workerName).pipe(
    Effect.map(Option.filter((observability) => issuesEnabled(observability) !== enabled)),
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.void,
        onSome: (observability) => patchIssues(workerName, observability, enabled),
      }),
    ),
  );

const workerIssuesProvider = succeedProvider(WorkerIssues, {
  diff: () => Effect.succeed({ action: "update" } as const),
  reconcile: ({ news }) =>
    setWorkerIssues(news.workerName, true).pipe(
      Effect.andThen(CloudflareEnvironment),
      Effect.flatten,
      Effect.map(({ accountId }) => ({ accountId, workerName: news.workerName })),
    ),
  delete: ({ output }) => setWorkerIssues(output.workerName, false),
});

const releaseVersion = Config.option(Config.NonEmptyString("GITHUB_SHA")).pipe(
  Config.map(
    Option.match({
      onNone: () => ({}),
      onSome: (tag) => ({ version: { tag, message: `Deploy ${tag}` } }),
    }),
  ),
);

const mirucordName = (resource: string): Effect.Effect<string, never, Stage> =>
  Effect.gen(function* resourceName() {
    const stage = yield* Stage;
    const name = `${NAME_PREFIX}-${resource}`;
    return Boolean.match(stage === PRODUCTION_STAGE, {
      onTrue: () => name,
      onFalse: () => `${name}-${stage}`,
    });
  });

const messagesIndex = Effect.gen(function* messagesIndex() {
  const index = yield* Vectorize.Index("Messages", {
    name: yield* mirucordName("messages-bge-m3"),
    dimensions: EMBEDDING_DIMENSIONS,
    metric: "cosine",
  });
  yield* Vectorize.MetadataIndex("MessagesGuildId", {
    indexName: index.indexName,
    propertyName: "guildId",
    indexType: "string",
  });
  yield* Vectorize.MetadataIndex("MessagesChannelId", {
    indexName: index.indexName,
    propertyName: "channelId",
    indexType: "string",
  });
  return index;
});

const masterKey = Effect.gen(function* masterKey() {
  const store = yield* SecretsStore.Store("Secrets");
  return yield* SecretsStore.Secret("MasterKeySecret", {
    store,
    name: "MIRUCORD_MASTER_KEY",
    value: yield* makeRandom("MasterKey"),
  });
});

const settings = Effect.gen(function* settings() {
  const discord = yield* discordEnv;
  const release = yield* releaseVersion;
  const operations = yield* operationsEnv;
  return { discord, release, operations };
});

const storage = Effect.gen(function* storage() {
  const DB = yield* D1.Database("MirucordDb", {
    name: yield* mirucordName("db"),
    primaryLocationHint: "apac",
    migrations: "./drizzle",
  });
  yield* messagesIndex;
  const INGEST = yield* Queues.Queue("Ingest", { name: yield* mirucordName("ingest") });
  return { DB, INGEST };
});

const web = Effect.gen(function* web() {
  const { DB, INGEST } = yield* storage;
  const BETTER_AUTH_SECRET = yield* makeRandom("BetterAuthSecret");
  const MASTER_KEY = yield* masterKey;
  const { discord, release, operations } = yield* settings;
  const site = yield* Website.Vite("Web", {
    name: yield* mirucordName("web"),
    domain: SITE_HOST,
    main: "src/app/server/index.ts",
    crons: [POLL_CRON, SYNC_CRON],
    compatibility: { flags: ["global_fetch_strictly_public"] },
    env: {
      ...discord,
      ...operations,
      BETTER_AUTH_SECRET,
      MASTER_KEY,
      DB,
      INGEST,
      GUILD_STORE: Workers.DurableObject<GuildStore>("GuildStore"),
      AI: Workers.AI(),
      VERSION: Workers.VersionMetadata(),
    },
    observability: { enabled: true, traces: { enabled: true } },
    viteEnvironments: { entry: "ssr", children: ["rsc"] },
    ...release,
  });
  yield* Queues.Consumer("IngestConsumer", {
    queueId: INGEST.queueId,
    scriptName: site.workerName,
    settings: { batchSize: 10, maxRetries: INGEST_MAX_RETRIES },
  });
  return site;
});

const stackProviders = workerIssuesProvider.pipe(Layer.provideMerge(providers()));

type WebEnv = InferEnv<typeof web>;

export type { WebEnv };
export default Stack(
  "web",
  {
    providers: stackProviders,
    state: state(),
  },
  Effect.gen(function* stack() {
    const { url, workerName, hash } = yield* web;
    yield* WorkerIssues("WorkerIssues", { workerName, deployment: hash });
    return { url };
  }),
);
