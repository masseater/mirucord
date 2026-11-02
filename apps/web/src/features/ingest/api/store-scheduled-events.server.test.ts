import { it } from "@effect/vitest";
import { runInDurableObject } from "cloudflare:test";
import { Effect, Option, Schema } from "effect";
import { beforeAll, expect } from "vite-plus/test";

import { guildStore } from "#/entities/guild-message/index.server";

import { seedMemberGuild } from "./__tests__/stored-members";
import { storeScheduledEvents } from "./store-activity.server";

const EVENT_GUILD = "871";
const QUIET_GUILD = "881";
const NOTICE_CHANNEL = "820";
const ALICE = "801";
const BOB = "802";
const MOVIE = "720";
const CREATED_AT = 1000;
const REMOVED_AT = 3000;
const STARTS_AT = 10_000;
const VOICE = 2;
const SCHEDULED = 1;
const NOTHING = Option.getOrNull(Option.none<string>());
const NO_CONSENT = Option.getOrNull(Option.none<string>());

const EventRow = Schema.Struct({
  id: Schema.String,
  creatorId: Schema.NullOr(Schema.String),
  removedAt: Schema.NullOr(Schema.Finite),
});
const InterestRow = Schema.Struct({ eventId: Schema.String, userId: Schema.String });
const Stored = Schema.Struct({
  events: Schema.Array(EventRow),
  interests: Schema.Array(InterestRow),
});
const decodeStored = Schema.decodeUnknownEffect(Stored);

const storedOf = (guildId: string): Effect.Effect<typeof Stored.Type> =>
  Effect.promise(() =>
    runInDurableObject(guildStore(guildId), (_store, state) => ({
      events: state.storage.sql
        .exec("SELECT id, creatorId, removedAt FROM scheduled_event")
        .toArray(),
      interests: state.storage.sql
        .exec("SELECT eventId, userId FROM event_interest ORDER BY userId")
        .toArray(),
    })),
  ).pipe(Effect.flatMap(decodeStored), Effect.orDie);

const SCHEDULE = {
  kind: "schedule",
  eventId: MOVIE,
  at: CREATED_AT,
  name: "Movie night",
  description: NOTHING,
  channelId: "710",
  creatorId: ALICE,
  location: NOTHING,
  entityType: VOICE,
  status: SCHEDULED,
  startsAt: STARTS_AT,
  endsAt: Option.getOrNull(Option.none<number>()),
  recurring: false,
} as const;

beforeAll(() =>
  Effect.runPromise(
    Effect.all([
      seedMemberGuild({ id: EVENT_GUILD, noticeChannelId: NOTICE_CHANNEL }),
      seedMemberGuild({ id: QUIET_GUILD, noticeChannelId: NO_CONSENT }),
    ]),
  ),
);

it.effect("keeps an event as history after Discord removes it, with who is interested", () =>
  Effect.gen(function* history() {
    const target = { eventId: MOVIE, at: CREATED_AT } as const;
    yield* storeScheduledEvents({
      kind: "scheduledEvents",
      guildId: EVENT_GUILD,
      changes: [
        SCHEDULE,
        { kind: "interest", ...target, userId: ALICE },
        { kind: "interest", ...target, userId: BOB },
        { kind: "uninterest", ...target, userId: BOB },
        { kind: "unschedule", eventId: MOVIE, at: REMOVED_AT },
      ],
    });
    expect(yield* storedOf(EVENT_GUILD)).toStrictEqual({
      events: [{ id: MOVIE, creatorId: ALICE, removedAt: REMOVED_AT }],
      interests: [{ eventId: MOVIE, userId: ALICE }],
    });
  }),
);

it.effect("records no events before the admin consents", () =>
  Effect.gen(function* quiet() {
    yield* storeScheduledEvents({
      kind: "scheduledEvents",
      guildId: QUIET_GUILD,
      changes: [SCHEDULE],
    });
    expect(yield* storedOf(QUIET_GUILD)).toStrictEqual({ events: [], interests: [] });
  }),
);
