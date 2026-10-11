import { Schema } from "effect";

const INGEST_MAX_RETRIES = 5;

const IngestJobSchema = Schema.Struct({ guildId: Schema.String, channelId: Schema.String });

const WithdrawJobSchema = Schema.Struct({
  kind: Schema.Literal("withdraw"),
  guildId: Schema.String,
});

const MessageIdsSchema = Schema.NonEmptyArray(Schema.String);

const RefreshJobSchema = Schema.Struct({
  kind: Schema.Literal("refresh"),
  guildId: Schema.String,
  channelId: Schema.String,
  messageIds: MessageIdsSchema,
});

const ForgetJobSchema = Schema.Struct({
  kind: Schema.Literal("forget"),
  guildId: Schema.String,
  channelId: Schema.String,
  messageIds: MessageIdsSchema,
});

const GatewayJobSchema = Schema.Union([RefreshJobSchema, ForgetJobSchema]);

const QueueJobSchema = Schema.Union([WithdrawJobSchema, IngestJobSchema]);

type IngestJob = typeof IngestJobSchema.Type;

type GatewayJob = typeof GatewayJobSchema.Type;

type RefreshJob = typeof RefreshJobSchema.Type;

type ForgetJob = typeof ForgetJobSchema.Type;

type QueueJob = typeof QueueJobSchema.Type;

export { GatewayJobSchema, INGEST_MAX_RETRIES, QueueJobSchema };
export type { ForgetJob, GatewayJob, IngestJob, QueueJob, RefreshJob };
