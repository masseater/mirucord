import { DiscordMessageSchema } from "@repo/shared-util-discord";
import { Schema } from "effect";

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

const StoreJobSchema = Schema.Struct({
  kind: Schema.Literal("store"),
  guildId: Schema.String,
  channelId: Schema.String,
  messages: Schema.NonEmptyArray(DiscordMessageSchema),
});

const JoinJobSchema = Schema.Struct({
  kind: Schema.Literal("join"),
  guildId: Schema.String,
});

const SyncJobSchema = Schema.Struct({
  kind: Schema.Literal("sync"),
  guildId: Schema.String,
});

const LeaveJobSchema = Schema.Struct({
  kind: Schema.Literal("leave"),
  guildId: Schema.String,
});

const ResyncJobSchema = Schema.Struct({ kind: Schema.Literal("resync") });

const GatewayJobSchema = Schema.Union([
  StoreJobSchema,
  RefreshJobSchema,
  ForgetJobSchema,
  JoinJobSchema,
  SyncJobSchema,
  LeaveJobSchema,
  ResyncJobSchema,
]);

type GatewayJob = typeof GatewayJobSchema.Type;

type RefreshJob = typeof RefreshJobSchema.Type;

type ForgetJob = typeof ForgetJobSchema.Type;

type StoreJob = typeof StoreJobSchema.Type;

export { GatewayJobSchema };
export type { ForgetJob, GatewayJob, RefreshJob, StoreJob };
