import { isGuildJob, isGuildWideJob, isMemberJob } from "@repo/ingest-util-gateway-contract";
import type { GatewayJob, GuildJob } from "@repo/ingest-util-gateway-contract";
import { DiscordMessageSchema } from "@repo/shared-util-discord";
import type { DiscordMessage } from "@repo/shared-util-discord";
import { Discord } from "dfx";
import { Array, Match, Option, pipe, Record, Schema } from "effect";

import { guildUpdateJob, joinJob, leaveJob, resyncJob, syncJob, syncJobOf } from "./guild-job";
import { departJob, memberJobKeyOf, membersJob, mergeMemberJobs } from "./member-job";
import { mergeVoiceJobs, voiceJobKeyOf, voiceJobOf } from "./voice-job";

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
  Match.discriminator("t")(
    Discord.GatewayDispatchEvents.GuildMemberAdd,
    Discord.GatewayDispatchEvents.GuildMemberUpdate,
    (dispatch) => membersJob(dispatch.d),
  ),
  Match.discriminator("t")(Discord.GatewayDispatchEvents.GuildMemberRemove, (dispatch) =>
    departJob(dispatch.d),
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

type Received = Readonly<{ payload: GatewayPayload; now: number }>;

const toGatewayJobs = ({ payload, now }: Received): readonly GatewayJob[] =>
  Option.match(Option.liftPredicate(payload, isDispatch), {
    onNone: () => [],
    onSome: (dispatch) => [
      ...Option.toArray(jobOfDispatch(dispatch)),
      ...Option.toArray(voiceJobOf(dispatch)(now)),
    ],
  });

type Membership = Extract<GuildJob["kind"], "join" | "leave">;

const guildWideKeyOf = (job: GatewayJob & Readonly<{ guildId: string }>): string => {
  if (isMemberJob(job)) {
    return memberJobKeyOf(job);
  }
  if (job.kind === "voice" || job.kind === "voiceSnapshot") {
    return voiceJobKeyOf(job);
  }
  return job.guildId;
};

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
  if (isGuildWideJob(job)) {
    return guildWideKeyOf(job);
  }
  return Array.headNonEmpty(job.messageIds);
};

type MessageChange = Place & Readonly<{ messageId: string; change: Change }>;

const messageChangesOf = (job: GatewayJob): readonly MessageChange[] => {
  if (job.kind === "resync" || isGuildJob(job) || isGuildWideJob(job)) {
    return [];
  }
  const place = { guildId: job.guildId, channelId: job.channelId };
  if (job.kind === "store") {
    return pipe(
      job.messages,
      Array.map((message) => ({
        ...place,
        messageId: message.id,
        change: { kind: "store", message },
      })),
    );
  }
  const change: Change = { kind: job.kind };
  return pipe(
    job.messageIds,
    Array.map((messageId) => ({ ...place, messageId, change })),
  );
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
  pipe(
    events,
    Array.flatMap(({ change }) => {
      if (change.kind === "store") {
        return [change.message];
      }
      return [];
    }),
  );

const jobsOfGroup = (events: Array.NonEmptyReadonlyArray<MessageChange>): readonly GatewayJob[] => {
  const { change, guildId, channelId } = Array.headNonEmpty(events);
  if (change.kind === "store") {
    return pipe(
      Array.chunksOf(storedMessagesOf(events), MESSAGES_PER_JOB),
      Array.flatMap((chunk) =>
        Array.match(chunk, {
          onEmpty: (): readonly GatewayJob[] => [],
          onNonEmpty: (messages): readonly GatewayJob[] => [
            { kind: "store", guildId, channelId, messages },
          ],
        }),
      ),
    );
  }
  const messageIds = pipe(
    events,
    Array.map(({ messageId }) => messageId),
  );
  return pipe(
    Array.chunksOf(messageIds, MESSAGES_PER_JOB),
    Array.map((chunk): GatewayJob => ({
      kind: change.kind,
      guildId,
      channelId,
      messageIds: chunk,
    })),
  );
};

const mergeJobs = (jobs: readonly GatewayJob[]): readonly GatewayJob[] => {
  const latest = new Map(
    pipe(
      jobs,
      Array.flatMap((job) => messageChangesOf(job)),
      Array.map((event) => [event.messageId, event]),
    ),
  );
  const groups = Array.groupBy(
    [...latest.values()],
    ({ change, channelId }) => `${change.kind}:${channelId}`,
  );
  const membership = new Map(
    pipe(
      jobs,
      Array.flatMap((job) => membershipOf(job)),
    ),
  );
  const moves = pipe(
    [...membership],
    Array.map(([guildId, kind]): GatewayJob => ({ kind, guildId })),
  );
  const syncs = pipe(
    jobs,
    Array.flatMap((job) => syncedGuildsOf(job)),
    Array.dedupe,
    Array.filter((guildId) => !membership.has(guildId)),
    Array.map((guildId) => syncJobOf(guildId)),
  );
  return [
    ...Option.toArray(Array.findFirst(jobs, ({ kind }) => kind === "resync")),
    ...moves,
    ...syncs,
    ...mergeMemberJobs(jobs),
    ...mergeVoiceJobs(jobs),
    ...pipe(
      Record.values(groups),
      Array.flatMap((group) => jobsOfGroup(group)),
    ),
  ];
};

export { jobKeyOf, mergeJobs, toGatewayJobs };
export type { GatewayPayload, Received };
