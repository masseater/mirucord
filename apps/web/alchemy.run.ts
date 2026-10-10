import { Stack, makeRandom } from "alchemy";
import {
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
import { Config, Effect, Option, Schema } from "effect";

import { INGEST_MAX_RETRIES } from "./src/features/ingest/model/ingest-job.ts";
import { POLL_CRON, SYNC_CRON } from "./src/features/ingest/model/sync-schedule.ts";
import { SITE_HOST } from "./src/shared/config/site.ts";

const EMBEDDING_DIMENSIONS = 1024;
const NonEmptySecret = Schema.Redacted(Schema.NonEmptyString);

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

const web = Effect.gen(function* web() {
  const usDb = yield* D1.Database("DB", { migrations: "./drizzle" });
  const DB = yield* D1.Database("DbApac", {
    primaryLocationHint: "apac",
    clone: usDb,
    migrations: "./drizzle",
  });
  const MESSAGES = yield* messagesIndex;
  const INGEST = yield* Queues.Queue("Ingest");
  const BETTER_AUTH_SECRET = yield* makeRandom("BetterAuthSecret");
  const MASTER_KEY = yield* masterKey;
  const { discord, release, operations } = yield* settings;
  const site = yield* Website.Vite("Web", {
    main: "src/app/server/index.ts",
    domain: SITE_HOST,
    crons: [POLL_CRON, SYNC_CRON],
    env: {
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
