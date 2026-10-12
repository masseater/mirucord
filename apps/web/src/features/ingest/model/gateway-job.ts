import { GatewayDispatchEvents, GatewayOpcodes } from "discord-api-types/v10";
import type {
  GatewayDispatchPayload,
  GatewayMessageCreateDispatchData,
} from "discord-api-types/v10";
import { Array, Match, Option, Schema } from "effect";

import type { GatewayJob, MessageJob } from "./ingest-job";

type GatewayPayload = Readonly<{ op: GatewayOpcodes }>;

type JobKind = MessageJob["kind"];

const MESSAGES_PER_JOB = 100;

const MessageEvent = Schema.Struct({
  id: Schema.String,
  channel_id: Schema.String,
  guild_id: Schema.optionalKey(Schema.String),
});

const BulkDeleteEvent = Schema.Struct({
  ids: Schema.Array(Schema.String),
  channel_id: Schema.String,
  guild_id: Schema.optionalKey(Schema.String),
});

const GuildEvent = Schema.Struct({ id: Schema.String });

const GuildChangeEvent = Schema.Struct({ guild_id: Schema.optionalKey(Schema.String) });

const decodeGuild = Schema.decodeOption(GuildEvent);
const decodeGuildChange = Schema.decodeOption(GuildChangeEvent);
const decodeMessage = Schema.decodeOption(MessageEvent);
const decodeBulkDelete = Schema.decodeOption(BulkDeleteEvent);

const isDispatch = (payload: GatewayPayload): payload is GatewayDispatchPayload =>
  payload.op === GatewayOpcodes.Dispatch;

type Target = Readonly<
  Pick<GatewayMessageCreateDispatchData, "channel_id" | "guild_id"> & {
    messageIds: readonly [string, ...string[]];
  }
>;

const jobFor = (kind: JobKind, target: Target): Option.Option<GatewayJob> =>
  Option.fromUndefinedOr(target.guild_id).pipe(
    Option.map((guildId) => ({
      kind,
      guildId,
      channelId: target.channel_id,
      messageIds: target.messageIds,
    })),
  );

const singleJob = (kind: JobKind, data: typeof MessageEvent.Encoded): Option.Option<GatewayJob> =>
  decodeMessage(data).pipe(
    Option.flatMap((event) => jobFor(kind, { ...event, messageIds: [event.id] })),
  );

const bulkJob = (data: typeof BulkDeleteEvent.Encoded): Option.Option<GatewayJob> =>
  decodeBulkDelete(data).pipe(
    Option.flatMap(({ ids, ...event }) =>
      Option.liftPredicate(ids, Array.isReadonlyArrayNonEmpty).pipe(
        Option.flatMap((messageIds) => jobFor("forget", { ...event, messageIds })),
      ),
    ),
  );

const joinJob = (data: typeof GuildEvent.Encoded): Option.Option<GatewayJob> =>
  decodeGuild(data).pipe(Option.map(({ id }) => ({ kind: "join", guildId: id })));

const syncJobOf = (guildId: string): GatewayJob => ({ kind: "sync", guildId });

const syncJob = (data: typeof GuildChangeEvent.Encoded): Option.Option<GatewayJob> =>
  decodeGuildChange(data).pipe(
    Option.flatMap(({ guild_id }) => Option.fromUndefinedOr(guild_id)),
    Option.map(syncJobOf),
  );

const guildUpdateJob = (data: typeof GuildEvent.Encoded): Option.Option<GatewayJob> =>
  decodeGuild(data).pipe(Option.map(({ id }) => syncJobOf(id)));

const jobOfDispatch = Match.type<GatewayDispatchPayload>().pipe(
  Match.discriminator("t")(
    GatewayDispatchEvents.MessageCreate,
    GatewayDispatchEvents.MessageUpdate,
    (dispatch) => singleJob("refresh", dispatch.d),
  ),
  Match.discriminator("t")(GatewayDispatchEvents.MessageDelete, (dispatch) =>
    singleJob("forget", dispatch.d),
  ),
  Match.discriminator("t")(GatewayDispatchEvents.MessageDeleteBulk, (dispatch) =>
    bulkJob(dispatch.d),
  ),
  Match.discriminator("t")(GatewayDispatchEvents.GuildCreate, (dispatch) => joinJob(dispatch.d)),
  Match.discriminator("t")(GatewayDispatchEvents.GuildUpdate, (dispatch) =>
    guildUpdateJob(dispatch.d),
  ),
  Match.discriminator("t")(
    GatewayDispatchEvents.ChannelCreate,
    GatewayDispatchEvents.ChannelUpdate,
    GatewayDispatchEvents.ChannelDelete,
    GatewayDispatchEvents.ThreadCreate,
    GatewayDispatchEvents.ThreadUpdate,
    GatewayDispatchEvents.ThreadDelete,
    GatewayDispatchEvents.GuildRoleCreate,
    GatewayDispatchEvents.GuildRoleUpdate,
    GatewayDispatchEvents.GuildRoleDelete,
    (dispatch) => syncJob(dispatch.d),
  ),
  Match.orElse((): Option.Option<GatewayJob> => Option.none()),
);

const toGatewayJob = (payload: GatewayPayload): Option.Option<GatewayJob> =>
  Option.liftPredicate(payload, isDispatch).pipe(Option.flatMap(jobOfDispatch));

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
export type { GatewayPayload };
