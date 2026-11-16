import { DiscordMemberSchema, DiscordMessageSchema } from "@repo/shared-util-discord";
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

const MembersJobSchema = Schema.Struct({
  kind: Schema.Literal("members"),
  guildId: Schema.String,
  members: Schema.NonEmptyArray(DiscordMemberSchema),
});

const DepartJobSchema = Schema.Struct({
  kind: Schema.Literal("depart"),
  guildId: Schema.String,
  userIds: Schema.NonEmptyArray(Schema.String),
});

const VoiceChangeSchema = Schema.Struct({
  userId: Schema.String,
  channelId: Schema.NullOr(Schema.String),
  at: Schema.Finite,
});

const VoiceJobSchema = Schema.Struct({
  kind: Schema.Literal("voice"),
  guildId: Schema.String,
  changes: Schema.NonEmptyArray(VoiceChangeSchema),
});

const VoiceSnapshotJobSchema = Schema.Struct({
  kind: Schema.Literal("voiceSnapshot"),
  guildId: Schema.String,
  at: Schema.Finite,
  present: Schema.Array(Schema.Struct({ userId: Schema.String, channelId: Schema.String })),
});

const ReactionTarget = {
  channelId: Schema.String,
  messageId: Schema.String,
  at: Schema.Finite,
};

const ReactionChangeSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("add"),
    ...ReactionTarget,
    userId: Schema.String,
    messageAuthorId: Schema.NullOr(Schema.String),
    emoji: Schema.String,
    burst: Schema.Boolean,
  }),
  Schema.Struct({
    kind: Schema.Literal("remove"),
    ...ReactionTarget,
    userId: Schema.String,
    emoji: Schema.String,
    burst: Schema.Boolean,
  }),
  Schema.Struct({
    kind: Schema.Literal("clear"),
    ...ReactionTarget,
    emoji: Schema.NullOr(Schema.String),
  }),
  Schema.Struct({
    kind: Schema.Literals(["vote", "unvote"]),
    ...ReactionTarget,
    userId: Schema.String,
    answerId: Schema.Int,
  }),
]);

const ReactionsJobSchema = Schema.Struct({
  kind: Schema.Literal("reactions"),
  guildId: Schema.String,
  changes: Schema.NonEmptyArray(ReactionChangeSchema),
});

const ResyncJobSchema = Schema.Struct({ kind: Schema.Literal("resync") });

export const GatewayJobSchema = Schema.Union([
  StoreJobSchema,
  RefreshJobSchema,
  ForgetJobSchema,
  JoinJobSchema,
  SyncJobSchema,
  LeaveJobSchema,
  MembersJobSchema,
  DepartJobSchema,
  VoiceJobSchema,
  VoiceSnapshotJobSchema,
  ReactionsJobSchema,
  ResyncJobSchema,
]);

export type GatewayJob = typeof GatewayJobSchema.Type;

export type RefreshJob = typeof RefreshJobSchema.Type;

export type ForgetJob = typeof ForgetJobSchema.Type;

export type StoreJob = typeof StoreJobSchema.Type;

export type MembersJob = typeof MembersJobSchema.Type;

export type DepartJob = typeof DepartJobSchema.Type;

export type VoiceJob = typeof VoiceJobSchema.Type;

export type VoiceSnapshotJob = typeof VoiceSnapshotJobSchema.Type;

export type VoiceChange = typeof VoiceChangeSchema.Type;

export type ReactionsJob = typeof ReactionsJobSchema.Type;

export type ReactionChange = typeof ReactionChangeSchema.Type;
