import { Stack, makeRandom } from "alchemy";
import { D1, Queues, Vectorize, Website, Workers, providers, state } from "alchemy/Cloudflare";
import type { InferEnv } from "alchemy/Cloudflare";
import { Config, Effect, Option, Schema } from "effect";

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

const web = Effect.gen(function* web() {
  const DB = yield* D1.Database("DB", { migrations: "./drizzle" });
  const MESSAGES = yield* Vectorize.Index("Messages", {
    dimensions: EMBEDDING_DIMENSIONS,
    metric: "cosine",
  });
  yield* Vectorize.MetadataIndex("MessagesGuildId", {
    indexName: MESSAGES.indexName,
    propertyName: "guildId",
    indexType: "string",
  });
  yield* Vectorize.MetadataIndex("MessagesChannelId", {
    indexName: MESSAGES.indexName,
    propertyName: "channelId",
    indexType: "string",
  });
  const INGEST = yield* Queues.Queue("Ingest");
  const BETTER_AUTH_SECRET = yield* makeRandom("BetterAuthSecret");
  const MASTER_KEY = yield* makeRandom("MasterKey");
  const otlp = yield* otlpEnv;
  const discord = yield* discordEnv;
  const site = yield* Website.Vite("Web", {
    main: "src/app/server/worker.ts",
    domain: SITE_HOST,
    crons: ["*/5 * * * *"],
    env: {
      ...otlp,
      ...discord,
      BETTER_AUTH_SECRET,
      MASTER_KEY,
      DB,
      MESSAGES,
      INGEST,
      AI: Workers.AI(),
    },
    observability: { enabled: true, traces: { enabled: true } },
    viteEnvironments: { entry: "ssr", children: ["rsc"] },
  });
  yield* Queues.Consumer("IngestConsumer", {
    queueId: INGEST.queueId,
    scriptName: site.workerName,
    settings: { batchSize: 10, maxRetries: 5 },
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
