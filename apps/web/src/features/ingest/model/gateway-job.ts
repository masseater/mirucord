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

const decodeGuild = Schema.decodeUnknownOption(GuildEvent);
const decodeMessage = Schema.decodeUnknownOption(MessageEvent);
const decodeBulkDelete = Schema.decodeUnknownOption(BulkDeleteEvent);

const KIND_OF_EVENT: ReadonlyMap<string, JobKind> = new Map([
  [GatewayDispatchEvents.MessageCreate, "refresh"],
  [GatewayDispatchEvents.MessageUpdate, "refresh"],
  [GatewayDispatchEvents.MessageDelete, "forget"],
]);

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

const toGatewayJob = ({ event, data }: GatewayEvent): Option.Option<GatewayJob> => {
  if (event === GatewayDispatchEvents.MessageDeleteBulk) {
    return bulkJob(data);
  }
  if (event === GatewayDispatchEvents.GuildCreate) {
    return joinJob(data);
  }
  return Option.fromNullOr(event).pipe(
    Option.flatMap((name) => Option.fromUndefinedOr(KIND_OF_EVENT.get(name))),
    Option.flatMap((kind) => singleJob(kind, data)),
  );
};

const subjectOf = (job: GatewayJob): Readonly<Record<string, string>> => {
  if (job.kind === "join") {
    return { kind: job.kind, guildId: job.guildId };
  }
  return { kind: job.kind, channelId: job.channelId };
};

const jobKeyOf = (job: GatewayJob): string => {
  if (job.kind === "join") {
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
  if (job.kind === "join") {
    return [];
  }
  return job.messageIds.map((messageId) => ({
    kind: job.kind,
    guildId: job.guildId,
    channelId: job.channelId,
    messageId,
  }));
};

const joinedGuildsOf = (job: GatewayJob): readonly string[] => {
  if (job.kind === "join") {
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
  const joins = [...new Set(jobs.flatMap((job) => joinedGuildsOf(job)))].map(
    (guildId): GatewayJob => ({
      kind: "join",
      guildId,
    }),
  );
  return [...joins, ...Object.values(groups).flatMap((group) => jobsOfGroup(group))];
};

export { jobKeyOf, mergeJobs, subjectOf, toGatewayJob };
export type { GatewayEvent };
