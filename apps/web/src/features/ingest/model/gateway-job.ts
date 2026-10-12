import { GatewayDispatchEvents } from "discord-api-types/v10";
import { Array, Option, Schema } from "effect";

import type { GatewayJob, MessageJob } from "./ingest-job";

type GatewayEvent = Readonly<{ event: string | null; data: unknown }>;

type JobKind = MessageJob["kind"];

const MESSAGES_PER_JOB = 100;

const MessageEvent = Schema.Struct({
  id: Schema.String,
  channel_id: Schema.String,
  guild_id: Schema.optional(Schema.String),
});

const BulkDeleteEvent = Schema.Struct({
  ids: Schema.NonEmptyArray(Schema.String),
  channel_id: Schema.String,
  guild_id: Schema.optional(Schema.String),
});

const GuildEvent = Schema.Struct({ id: Schema.String });

const GuildChangeEvent = Schema.Struct({ guild_id: Schema.String });

const decodeGuild = Schema.decodeUnknownOption(GuildEvent);
const decodeGuildChange = Schema.decodeUnknownOption(GuildChangeEvent);
const decodeMessage = Schema.decodeUnknownOption(MessageEvent);
const decodeBulkDelete = Schema.decodeUnknownOption(BulkDeleteEvent);

type Target = Readonly<{
  channel_id: string;
  guild_id?: string | undefined;
  messageIds: readonly [string, ...string[]];
}>;

const jobFor = (kind: JobKind, target: Target): Option.Option<GatewayJob> =>
  Option.fromUndefinedOr(target.guild_id).pipe(
    Option.map((guildId) => ({
      kind,
      guildId,
      channelId: target.channel_id,
      messageIds: target.messageIds,
    })),
  );

const singleJob = (kind: JobKind, data: unknown): Option.Option<GatewayJob> =>
  decodeMessage(data).pipe(
    Option.flatMap((event) => jobFor(kind, { ...event, messageIds: [event.id] })),
  );

const bulkJob = (data: unknown): Option.Option<GatewayJob> =>
  decodeBulkDelete(data).pipe(
    Option.flatMap((event) => jobFor("forget", { ...event, messageIds: event.ids })),
  );

const joinJob = (data: unknown): Option.Option<GatewayJob> =>
  decodeGuild(data).pipe(Option.map(({ id }) => ({ kind: "join", guildId: id })));

const syncJobOf = (guildId: string): GatewayJob => ({ kind: "sync", guildId });

const syncJob = (data: unknown): Option.Option<GatewayJob> =>
  decodeGuildChange(data).pipe(Option.map(({ guild_id }) => syncJobOf(guild_id)));

const guildUpdateJob = (data: unknown): Option.Option<GatewayJob> =>
  decodeGuild(data).pipe(Option.map(({ id }) => syncJobOf(id)));

type JobOfEvent = (data: unknown) => Option.Option<GatewayJob>;

const refreshJob: JobOfEvent = (data) => singleJob("refresh", data);
const forgetJob: JobOfEvent = (data) => singleJob("forget", data);

const JOB_OF_EVENT: ReadonlyMap<string, JobOfEvent> = new Map([
  [GatewayDispatchEvents.MessageCreate, refreshJob],
  [GatewayDispatchEvents.MessageUpdate, refreshJob],
  [GatewayDispatchEvents.MessageDelete, forgetJob],
  [GatewayDispatchEvents.MessageDeleteBulk, bulkJob],
  [GatewayDispatchEvents.GuildCreate, joinJob],
  [GatewayDispatchEvents.GuildUpdate, guildUpdateJob],
  [GatewayDispatchEvents.ChannelCreate, syncJob],
  [GatewayDispatchEvents.ChannelUpdate, syncJob],
  [GatewayDispatchEvents.ChannelDelete, syncJob],
  [GatewayDispatchEvents.ThreadCreate, syncJob],
  [GatewayDispatchEvents.ThreadUpdate, syncJob],
  [GatewayDispatchEvents.ThreadDelete, syncJob],
  [GatewayDispatchEvents.GuildRoleCreate, syncJob],
  [GatewayDispatchEvents.GuildRoleUpdate, syncJob],
  [GatewayDispatchEvents.GuildRoleDelete, syncJob],
]);

const toGatewayJob = ({ event, data }: GatewayEvent): Option.Option<GatewayJob> =>
  Option.fromNullOr(event).pipe(
    Option.flatMap((name) => Option.fromUndefinedOr(JOB_OF_EVENT.get(name))),
    Option.flatMap((jobOf) => jobOf(data)),
  );

const subjectOf = (job: GatewayJob): Readonly<Record<string, string>> => {
  if (job.kind === "join" || job.kind === "sync") {
    return { kind: job.kind, guildId: job.guildId };
  }
  return { kind: job.kind, channelId: job.channelId };
};

const jobKeyOf = (job: GatewayJob): string => {
  if (job.kind === "join" || job.kind === "sync") {
    return job.guildId;
  }
  return Array.headNonEmpty(job.messageIds);
};

type MessageChange = Readonly<{
  kind: JobKind;
  guildId: string;
  channelId: string;
  messageId: string;
}>;

const messageChangesOf = (job: GatewayJob): readonly MessageChange[] => {
  if (job.kind === "join" || job.kind === "sync") {
    return [];
  }
  return job.messageIds.map((messageId) => ({
    kind: job.kind,
    guildId: job.guildId,
    channelId: job.channelId,
    messageId,
  }));
};

const guildsOf = (kind: "join" | "sync", job: GatewayJob): readonly string[] => {
  if (job.kind === kind) {
    return [job.guildId];
  }
  return [];
};

const jobsOfGroup = (events: Array.NonEmptyReadonlyArray<MessageChange>): readonly GatewayJob[] => {
  const { kind, guildId, channelId } = Array.headNonEmpty(events);
  const messageIds = events.map(({ messageId }) => messageId);
  return Array.chunksOf(messageIds, MESSAGES_PER_JOB).map((chunk): GatewayJob => ({
    kind,
    guildId,
    channelId,
    messageIds: chunk,
  }));
};

const mergeJobs = (jobs: readonly GatewayJob[]): readonly GatewayJob[] => {
  const latest = new Map(
    jobs.flatMap((job) => messageChangesOf(job)).map((event) => [event.messageId, event]),
  );
  const groups = Array.groupBy(
    [...latest.values()],
    ({ kind, channelId }) => `${kind}:${channelId}`,
  );
  const joined = new Set(jobs.flatMap((job) => guildsOf("join", job)));
  const joins = [...joined].map((guildId): GatewayJob => ({ kind: "join", guildId }));
  const syncs = [...new Set(jobs.flatMap((job) => guildsOf("sync", job)))]
    .filter((guildId) => !joined.has(guildId))
    .map((guildId) => syncJobOf(guildId));
  return [...joins, ...syncs, ...Object.values(groups).flatMap((group) => jobsOfGroup(group))];
};

export { jobKeyOf, mergeJobs, subjectOf, toGatewayJob };
export type { GatewayEvent };
