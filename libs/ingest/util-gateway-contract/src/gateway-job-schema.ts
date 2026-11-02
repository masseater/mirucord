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

const ScheduledEventTarget = { eventId: Schema.String, at: Schema.Finite };

const ScheduledEventChangeSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("schedule"),
    ...ScheduledEventTarget,
    name: Schema.String,
    description: Schema.NullOr(Schema.String),
    channelId: Schema.NullOr(Schema.String),
    creatorId: Schema.NullOr(Schema.String),
    location: Schema.NullOr(Schema.String),
    entityType: Schema.Int,
    status: Schema.Int,
    startsAt: Schema.Finite,
    endsAt: Schema.NullOr(Schema.Finite),
    recurring: Schema.Boolean,
  }),
  Schema.Struct({ kind: Schema.Literal("unschedule"), ...ScheduledEventTarget }),
  Schema.Struct({
    kind: Schema.Literals(["interest", "uninterest"]),
    ...ScheduledEventTarget,
    userId: Schema.String,
  }),
]);

const ScheduledEventsJobSchema = Schema.Struct({
  kind: Schema.Literal("scheduledEvents"),
  guildId: Schema.String,
  changes: Schema.NonEmptyArray(ScheduledEventChangeSchema),
});

const ThreadMemberChangeSchema = Schema.Struct({
  kind: Schema.Literals(["join", "leave"]),
  threadId: Schema.String,
  userId: Schema.String,
  at: Schema.Finite,
});

const ThreadMembersJobSchema = Schema.Struct({
  kind: Schema.Literal("threadMembers"),
  guildId: Schema.String,
  changes: Schema.NonEmptyArray(ThreadMemberChangeSchema),
});

const AuditLogEntrySchema = Schema.Struct({
  entryId: Schema.String,
  actionType: Schema.Int,
  userId: Schema.NullOr(Schema.String),
  targetId: Schema.NullOr(Schema.String),
  at: Schema.Finite,
  detail: Schema.String,
});

const AuditLogJobSchema = Schema.Struct({
  kind: Schema.Literal("auditLog"),
  guildId: Schema.String,
  changes: Schema.NonEmptyArray(AuditLogEntrySchema),
});

const ResyncJobSchema = Schema.Struct({ kind: Schema.Literal("resync") });

const GatewayJobSchema = Schema.Union([
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
  ScheduledEventsJobSchema,
  ThreadMembersJobSchema,
  AuditLogJobSchema,
  ResyncJobSchema,
]);

type GatewayJob = typeof GatewayJobSchema.Type;

type RefreshJob = typeof RefreshJobSchema.Type;

type ForgetJob = typeof ForgetJobSchema.Type;

type StoreJob = typeof StoreJobSchema.Type;

type MembersJob = typeof MembersJobSchema.Type;

type DepartJob = typeof DepartJobSchema.Type;

type VoiceJob = typeof VoiceJobSchema.Type;

type VoiceSnapshotJob = typeof VoiceSnapshotJobSchema.Type;

type VoiceChange = typeof VoiceChangeSchema.Type;

type ReactionsJob = typeof ReactionsJobSchema.Type;

type ReactionChange = typeof ReactionChangeSchema.Type;

type ScheduledEventsJob = typeof ScheduledEventsJobSchema.Type;

type ScheduledEventChange = typeof ScheduledEventChangeSchema.Type;

type ThreadMembersJob = typeof ThreadMembersJobSchema.Type;

type ThreadMemberChange = typeof ThreadMemberChangeSchema.Type;

type AuditLogJob = typeof AuditLogJobSchema.Type;

type AuditLogEntry = typeof AuditLogEntrySchema.Type;

export { GatewayJobSchema };
export type {
  AuditLogEntry,
  AuditLogJob,
  DepartJob,
  ForgetJob,
  GatewayJob,
  MembersJob,
  ReactionChange,
  ReactionsJob,
  RefreshJob,
  ScheduledEventChange,
  ScheduledEventsJob,
  StoreJob,
  ThreadMemberChange,
  ThreadMembersJob,
  VoiceChange,
  VoiceJob,
  VoiceSnapshotJob,
};
