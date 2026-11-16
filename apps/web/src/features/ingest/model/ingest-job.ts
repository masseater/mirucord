import { Schema } from "effect";

export const INGEST_MAX_RETRIES = 5;

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

const MembersJobSchema = Schema.Struct({
  kind: Schema.Literal("members"),
  guildId: Schema.String,
});

export const QueueJobSchema = Schema.Union([
  WithdrawJobSchema,
  MigrateJobSchema,
  CatchUpJobSchema,
  MembersJobSchema,
  IngestJobSchema,
]);

export type IngestJob = typeof IngestJobSchema.Type;

export type QueueJob = typeof QueueJobSchema.Type;
