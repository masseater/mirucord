import { Stack, makeRandom } from "alchemy";
import { D1, Queues, Vectorize, Website, Workers, providers, state } from "alchemy/Cloudflare";
import type { InferEnv } from "alchemy/Cloudflare";
import { Config, Effect, Option, Schema } from "effect";

import { INGEST_MAX_RETRIES } from "./src/features/ingest/model/ingest-job.ts";
import { SITE_HOST } from "./src/shared/config/site.ts";

const OTLP = "otlp";
const EMBEDDING_DIMENSIONS = 1024;
const NonEmptySecret = Schema.Redacted(Schema.NonEmptyString);

const otlpEnv = Config.all({
  endpoint: Config.option(Config.NonEmptyString("OTEL_EXPORTER_OTLP_ENDPOINT")),
  headers: Config.option(Config.schema(NonEmptySecret, "OTEL_EXPORTER_OTLP_HEADERS")),
}).pipe(
  Config.map(({ endpoint, headers }) =>
    Option.match(endpoint, {
      onNone: () => ({}),
      onSome: (OTEL_EXPORTER_OTLP_ENDPOINT) => ({
        OTEL_EXPORTER_OTLP_ENDPOINT,
        OTEL_TRACES_EXPORTER: OTLP,
        OTEL_METRICS_EXPORTER: OTLP,
        OTEL_LOGS_EXPORTER: OTLP,
        ...Option.match(headers, {
          onNone: () => ({}),
          onSome: (OTEL_EXPORTER_OTLP_HEADERS) => ({ OTEL_EXPORTER_OTLP_HEADERS }),
        }),
      }),
    }),
  ),
);

const discordEnv = Config.all({
  DISCORD_CLIENT_ID: Config.NonEmptyString("DISCORD_CLIENT_ID"),
  DISCORD_CLIENT_SECRET: Config.schema(NonEmptySecret, "DISCORD_CLIENT_SECRET"),
  DISCORD_BOT_TOKEN: Config.schema(NonEmptySecret, "DISCORD_BOT_TOKEN"),
});

const operationsEnv = Config.all({
  MAX_GUILDS: Config.String("MAX_GUILDS").pipe(Config.withDefault("80")),
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

const releaseVersion = Config.option(Config.NonEmptyString("GITHUB_SHA")).pipe(
  Config.map(
    Option.match({
      onNone: () => ({}),
      onSome: (tag) => ({ version: { tag, message: `Deploy ${tag}` } }),
    }),
  ),
);

const messagesIndex = Effect.gen(function* messagesIndex() {
  const index = yield* Vectorize.Index("Messages", {
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

const settings = Effect.gen(function* settings() {
  const otlp = yield* otlpEnv;
  const discord = yield* discordEnv;
  const release = yield* releaseVersion;
  const operations = yield* operationsEnv;
  return { otlp, discord, release, operations };
});

const web = Effect.gen(function* web() {
  const DB = yield* D1.Database("DB", { migrations: "./drizzle" });
  const MESSAGES = yield* messagesIndex;
  const INGEST = yield* Queues.Queue("Ingest");
  const BETTER_AUTH_SECRET = yield* makeRandom("BetterAuthSecret");
  const MASTER_KEY = yield* makeRandom("MasterKey");
  const { otlp, discord, release, operations } = yield* settings;
  const site = yield* Website.Vite("Web", {
    main: "src/app/server/index.ts",
    domain: SITE_HOST,
    crons: ["*/5 * * * *"],
    env: {
      ...otlp,
      ...discord,
      ...operations,
      BETTER_AUTH_SECRET,
      MASTER_KEY,
      DB,
      MESSAGES,
      INGEST,
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

type WebEnv = InferEnv<typeof web>;

export type { WebEnv };
export default Stack(
  "web",
  { providers: providers(), state: state() },
  Effect.gen(function* stack() {
    const { url } = yield* web;
    return { url };
  }),
);
