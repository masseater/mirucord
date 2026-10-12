import { isGuildJob } from "@repo/ingest-util-gateway-contract";
import type { GatewayJob, GuildJob } from "@repo/ingest-util-gateway-contract";
import { DiscordMessageSchema } from "@repo/shared-util-discord";
import type { DiscordMessage } from "@repo/shared-util-discord";
import { Discord } from "dfx";
import { Array, Match, Option, Schema } from "effect";

type GatewayPayload = Readonly<{ op: Discord.GatewayOpcodes }>;

type Change =
  | Readonly<{ kind: "refresh" }>
  | Readonly<{ kind: "forget" }>
  | Readonly<{ kind: "store"; message: DiscordMessage }>;

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
const decodeFullMessage = Schema.decodeOption(DiscordMessageSchema);
const decodeBulkDelete = Schema.decodeOption(BulkDeleteEvent);

const isDispatch = (payload: GatewayPayload): payload is Discord.GatewayDispatchPayload =>
  payload.op === Discord.GatewayOpcodes.Dispatch;

type Place = Readonly<{ guildId: string; channelId: string }>;

const placeOf = ({
  channel_id,
  guild_id,
}: Readonly<
  Pick<Discord.GatewayMessageCreateDispatchData, "channel_id" | "guild_id">
>): Option.Option<Place> =>
  Option.fromUndefinedOr(guild_id).pipe(
    Option.map((guildId) => ({ guildId, channelId: channel_id })),
  );

const storeOrRefreshJob = (
  data: typeof MessageEvent.Encoded & typeof DiscordMessageSchema.Encoded,
): Option.Option<GatewayJob> =>
  decodeMessage(data).pipe(
    Option.flatMap((event) =>
      placeOf(event).pipe(
        Option.map((place): GatewayJob =>
          Option.match(decodeFullMessage(data), {
            onNone: () => ({ kind: "refresh", ...place, messageIds: [event.id] }),
            onSome: (message) => ({ kind: "store", ...place, messages: [message] }),
          }),
        ),
      ),
    ),
  );

const forgetOf = (
  event: Readonly<Pick<Discord.GatewayMessageCreateDispatchData, "channel_id" | "guild_id">>,
  messageIds: readonly [string, ...string[]],
): Option.Option<GatewayJob> =>
  placeOf(event).pipe(
    Option.map((place): GatewayJob => ({ kind: "forget", ...place, messageIds })),
  );

const forgetJob = (data: typeof MessageEvent.Encoded): Option.Option<GatewayJob> =>
  decodeMessage(data).pipe(Option.flatMap((event) => forgetOf(event, [event.id])));

const bulkJob = (data: typeof BulkDeleteEvent.Encoded): Option.Option<GatewayJob> =>
  decodeBulkDelete(data).pipe(
    Option.flatMap(({ ids, ...event }) =>
      Option.liftPredicate(ids, Array.isReadonlyArrayNonEmpty).pipe(
        Option.flatMap((messageIds) => forgetOf(event, messageIds)),
      ),
    ),
  );

const joinJob = (data: typeof GuildEvent.Encoded): Option.Option<GatewayJob> =>
  decodeGuild(data).pipe(Option.map(({ id }) => ({ kind: "join", guildId: id })));

const leaveJob = (
  data: Readonly<Discord.GatewayGuildDeleteDispatchData>,
): Option.Option<GatewayJob> =>
  Option.liftPredicate(data, ({ unavailable }) => unavailable !== true).pipe(
    Option.map(({ id }) => ({ kind: "leave", guildId: id })),
  );

const resyncJob = (): Option.Option<GatewayJob> => Option.some({ kind: "resync" });

const syncJobOf = (guildId: string): GatewayJob => ({ kind: "sync", guildId });

const syncJob = (data: typeof GuildChangeEvent.Encoded): Option.Option<GatewayJob> =>
  decodeGuildChange(data).pipe(
    Option.flatMap(({ guild_id }) => Option.fromUndefinedOr(guild_id)),
    Option.map(syncJobOf),
  );

const guildUpdateJob = (data: typeof GuildEvent.Encoded): Option.Option<GatewayJob> =>
  decodeGuild(data).pipe(Option.map(({ id }) => syncJobOf(id)));

const jobOfDispatch = Match.type<Discord.GatewayDispatchPayload>().pipe(
  Match.discriminator("t")(
    Discord.GatewayDispatchEvents.MessageCreate,
    Discord.GatewayDispatchEvents.MessageUpdate,
    (dispatch) => storeOrRefreshJob(dispatch.d),
  ),
  Match.discriminator("t")(Discord.GatewayDispatchEvents.MessageDelete, (dispatch) =>
    forgetJob(dispatch.d),
  ),
  Match.discriminator("t")(Discord.GatewayDispatchEvents.MessageDeleteBulk, (dispatch) =>
    bulkJob(dispatch.d),
  ),
  Match.discriminator("t")(Discord.GatewayDispatchEvents.GuildCreate, (dispatch) =>
    joinJob(dispatch.d),
  ),
  Match.discriminator("t")(Discord.GatewayDispatchEvents.GuildUpdate, (dispatch) =>
    guildUpdateJob(dispatch.d),
  ),
  Match.discriminator("t")(Discord.GatewayDispatchEvents.GuildDelete, (dispatch) =>
    leaveJob(dispatch.d),
  ),
  Match.discriminator("t")(Discord.GatewayDispatchEvents.Ready, resyncJob),
  Match.discriminator("t")(
    Discord.GatewayDispatchEvents.ChannelCreate,
    Discord.GatewayDispatchEvents.ChannelUpdate,
    Discord.GatewayDispatchEvents.ChannelDelete,
    Discord.GatewayDispatchEvents.ThreadCreate,
    Discord.GatewayDispatchEvents.ThreadUpdate,
    Discord.GatewayDispatchEvents.ThreadDelete,
    Discord.GatewayDispatchEvents.GuildRoleCreate,
    Discord.GatewayDispatchEvents.GuildRoleUpdate,
    Discord.GatewayDispatchEvents.GuildRoleDelete,
    (dispatch) => syncJob(dispatch.d),
  ),
  Match.orElse((): Option.Option<GatewayJob> => Option.none()),
);

const toGatewayJob = (payload: GatewayPayload): Option.Option<GatewayJob> =>
  Option.liftPredicate(payload, isDispatch).pipe(Option.flatMap(jobOfDispatch));

type Membership = Extract<GuildJob["kind"], "join" | "leave">;

const jobKeyOf = (job: GatewayJob): string => {
  if (job.kind === "resync") {
    return job.kind;
  }
  if (isGuildJob(job)) {
    return job.guildId;
  }
  if (job.kind === "store") {
    return Array.headNonEmpty(job.messages).id;
  }
  return Array.headNonEmpty(job.messageIds);
};

type MessageChange = Place & Readonly<{ messageId: string; change: Change }>;

const messageChangesOf = (job: GatewayJob): readonly MessageChange[] => {
  if (job.kind === "resync" || isGuildJob(job)) {
    return [];
  }
  const place = { guildId: job.guildId, channelId: job.channelId };
  if (job.kind === "store") {
    return job.messages.map((message) => ({
      ...place,
      messageId: message.id,
      change: { kind: "store", message },
    }));
  }
  const change: Change = { kind: job.kind };
  return job.messageIds.map((messageId) => ({ ...place, messageId, change }));
};

const syncedGuildsOf = (job: GatewayJob): readonly string[] => {
  if (job.kind === "sync") {
    return [job.guildId];
  }
  return [];
};

const membershipOf = (job: GatewayJob): readonly (readonly [string, Membership])[] => {
  if (job.kind === "join" || job.kind === "leave") {
    return [[job.guildId, job.kind]];
  }
  return [];
};

const storedMessagesOf = (events: readonly MessageChange[]): readonly DiscordMessage[] =>
  events.flatMap(({ change }) => {
    if (change.kind === "store") {
      return [change.message];
    }
    return [];
  });

const jobsOfGroup = (events: Array.NonEmptyReadonlyArray<MessageChange>): readonly GatewayJob[] => {
  const { change, guildId, channelId } = Array.headNonEmpty(events);
  if (change.kind === "store") {
    return Array.chunksOf(storedMessagesOf(events), MESSAGES_PER_JOB).flatMap((chunk) =>
      Array.match(chunk, {
        onEmpty: (): readonly GatewayJob[] => [],
        onNonEmpty: (messages): readonly GatewayJob[] => [
          { kind: "store", guildId, channelId, messages },
        ],
      }),
    );
  }
  const messageIds = events.map(({ messageId }) => messageId);
  return Array.chunksOf(messageIds, MESSAGES_PER_JOB).map((chunk): GatewayJob => ({
    kind: change.kind,
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
    ({ change, channelId }) => `${change.kind}:${channelId}`,
  );
  const membership = new Map(jobs.flatMap((job) => membershipOf(job)));
  const moves = [...membership].map(([guildId, kind]): GatewayJob => ({ kind, guildId }));
  const syncs = [...new Set(jobs.flatMap((job) => syncedGuildsOf(job)))]
    .filter((guildId) => !membership.has(guildId))
    .map((guildId) => syncJobOf(guildId));
  const resyncs = Option.toArray(Array.findFirst(jobs, ({ kind }) => kind === "resync"));
  return [
    ...resyncs,
    ...moves,
    ...syncs,
    ...Object.values(groups).flatMap((group) => jobsOfGroup(group)),
  ];
};

export { jobKeyOf, mergeJobs, toGatewayJob };
export type { GatewayPayload };
