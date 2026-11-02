import type {
  GatewayJob,
  ScheduledEventChange,
  ScheduledEventsJob,
} from "@repo/ingest-util-gateway-contract";
import { Discord } from "dfx";
import { Array, DateTime, Match, Option, pipe, Schema } from "effect";

import { mergeByGuild } from "./guild-batch";

const EntityMetadata = Schema.Struct({ location: Schema.optional(Schema.String) });

const ScheduledEvent = Schema.Struct({
  id: Schema.String,
  guild_id: Schema.String,
  name: Schema.String,
  description: Schema.optional(Schema.NullOr(Schema.String)),
  channel_id: Schema.optional(Schema.NullOr(Schema.String)),
  creator_id: Schema.optional(Schema.NullOr(Schema.String)),
  entity_type: Schema.Int,
  status: Schema.Int,
  scheduled_start_time: Schema.DateTimeUtcFromString,
  scheduled_end_time: Schema.optional(Schema.NullOr(Schema.DateTimeUtcFromString)),
  entity_metadata: Schema.optional(Schema.NullOr(EntityMetadata)),
  recurrence_rule: Schema.optional(Schema.NullOr(Schema.Unknown)),
});

const Interest = Schema.Struct({
  guild_id: Schema.String,
  guild_scheduled_event_id: Schema.String,
  user_id: Schema.String,
});

const Removal = Schema.Struct({ id: Schema.String, guild_id: Schema.String });

const GuildEvents = Schema.Struct({
  id: Schema.String,
  guild_scheduled_events: Schema.optional(Schema.Array(Schema.Unknown)),
});

const decodeEvent = Schema.decodeUnknownOption(ScheduledEvent);
const decodeInterest = Schema.decodeUnknownOption(Interest);
const decodeRemoval = Schema.decodeUnknownOption(Removal);
const decodeGuildEvents = Schema.decodeUnknownOption(GuildEvents);

const orNull = <Value>(value: Value | null | undefined): Value | null =>
  Option.getOrNull(Option.fromNullishOr(value));

const scheduleOf =
  (now: number) =>
  (event: typeof ScheduledEvent.Type): ScheduledEventChange => ({
    kind: "schedule",
    eventId: event.id,
    at: now,
    name: event.name,
    description: orNull(event.description),
    channelId: orNull(event.channel_id),
    creatorId: orNull(event.creator_id),
    location: Option.getOrNull(
      Option.flatMap(Option.fromNullishOr(event.entity_metadata), ({ location }) =>
        Option.fromUndefinedOr(location),
      ),
    ),
    entityType: event.entity_type,
    status: event.status,
    startsAt: DateTime.toEpochMillis(event.scheduled_start_time),
    endsAt: Option.getOrNull(
      Option.map(Option.fromNullishOr(event.scheduled_end_time), DateTime.toEpochMillis),
    ),
    recurring: Option.isSome(Option.fromNullishOr(event.recurrence_rule)),
  });

const jobOf = (
  guildId: string,
  changes: readonly ScheduledEventChange[],
): Option.Option<GatewayJob> =>
  Option.map(
    Array.match(changes, { onEmpty: Option.none, onNonEmpty: Option.some }),
    (nonEmpty): GatewayJob => ({ kind: "scheduledEvents", guildId, changes: nonEmpty }),
  );

const scheduledJob =
  (data: unknown) =>
  (now: number): Option.Option<GatewayJob> =>
    Option.flatMap(decodeEvent(data), (event) => jobOf(event.guild_id, [scheduleOf(now)(event)]));

const unscheduledJob =
  (data: unknown) =>
  (now: number): Option.Option<GatewayJob> =>
    Option.flatMap(decodeRemoval(data), ({ id, guild_id }) =>
      jobOf(guild_id, [{ kind: "unschedule", eventId: id, at: now }]),
    );

const interestJob =
  (data: unknown, kind: "interest" | "uninterest") =>
  (now: number): Option.Option<GatewayJob> =>
    Option.flatMap(decodeInterest(data), (event) =>
      jobOf(event.guild_id, [
        { kind, eventId: event.guild_scheduled_event_id, userId: event.user_id, at: now },
      ]),
    );

const schedulesOf =
  (now: number) =>
  (events: readonly unknown[]): readonly ScheduledEventChange[] =>
    pipe(
      events,
      Array.flatMap((event) => Option.toArray(decodeEvent(event))),
      Array.map(scheduleOf(now)),
    );

const snapshotJob =
  (data: unknown) =>
  (now: number): Option.Option<GatewayJob> =>
    Option.flatMap(decodeGuildEvents(data), (guild) =>
      jobOf(guild.id, schedulesOf(now)(guild.guild_scheduled_events ?? [])),
    );

const scheduledEventJobOf = Match.type<Discord.GatewayDispatchPayload>().pipe(
  Match.discriminator("t")(
    Discord.GatewayDispatchEvents.GuildScheduledEventCreate,
    Discord.GatewayDispatchEvents.GuildScheduledEventUpdate,
    (dispatch) => scheduledJob(dispatch.d),
  ),
  Match.discriminator("t")(Discord.GatewayDispatchEvents.GuildScheduledEventDelete, (dispatch) =>
    unscheduledJob(dispatch.d),
  ),
  Match.discriminator("t")(Discord.GatewayDispatchEvents.GuildScheduledEventUserAdd, (dispatch) =>
    interestJob(dispatch.d, "interest"),
  ),
  Match.discriminator("t")(
    Discord.GatewayDispatchEvents.GuildScheduledEventUserRemove,
    (dispatch) => interestJob(dispatch.d, "uninterest"),
  ),
  Match.discriminator("t")(Discord.GatewayDispatchEvents.GuildCreate, (dispatch) =>
    snapshotJob(dispatch.d),
  ),
  Match.orElse(() => (): Option.Option<GatewayJob> => Option.none()),
);

const scheduledEventJobKeyOf = (job: ScheduledEventsJob): string => {
  const { eventId, at } = Array.headNonEmpty(job.changes);
  return `${job.guildId}-${eventId}-${at}`;
};

const isScheduledEventsJob = (job: GatewayJob): job is ScheduledEventsJob =>
  job.kind === "scheduledEvents";

const mergeScheduledEventJobs = mergeByGuild({
  isBatch: isScheduledEventsJob,
  rebuild: (guildId, changes): GatewayJob => ({ kind: "scheduledEvents", guildId, changes }),
});

export { mergeScheduledEventJobs, scheduledEventJobKeyOf, scheduledEventJobOf };
