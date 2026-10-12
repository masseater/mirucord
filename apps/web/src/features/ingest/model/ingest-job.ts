import { Schema } from "effect";

const INGEST_MAX_RETRIES = 5;

const IngestJobSchema = Schema.Struct({
  guildId: Schema.String,
  channelId: Schema.String,
  resumeBefore: Schema.optionalKey(Schema.String),
});

const WithdrawJobSchema = Schema.Struct({
  kind: Schema.Literal("withdraw"),
  guildId: Schema.String,
});

const MigrateJobSchema = Schema.Struct({ kind: Schema.Literal("migrate") });

const CatchUpJobSchema = Schema.Struct({
  kind: Schema.Literal("catchUp"),
  guildId: Schema.String,
});

const QueueJobSchema = Schema.Union([
  WithdrawJobSchema,
  MigrateJobSchema,
  CatchUpJobSchema,
  IngestJobSchema,
]);

type IngestJob = typeof IngestJobSchema.Type;

type QueueJob = typeof QueueJobSchema.Type;

export { INGEST_MAX_RETRIES, QueueJobSchema };
export type { IngestJob, QueueJob };
