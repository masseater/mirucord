import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { runInDurableObject } from "cloudflare:test";
import { RouteBases, Routes } from "discord-api-types/v10";
import { Array, DateTime, Effect, Option, pipe, Schema } from "effect";
import { http, HttpResponse } from "msw";
import { afterAll, beforeAll, expect } from "vite-plus/test";

import { guildStore } from "#/entities/guild-message/index.server";

import {
  A_OPEN,
  A_STAFF,
  discordMembers,
  GUILD_A,
  GUILD_B,
  seedScenario,
} from "./__tests__/scenario";
import { callTool } from "./__tests__/tool-call";

const ALICE = "801";
const BOB = "802";
const CAROL = "803";
const MOVIE = "720";
const MEETUP = "721";
const SECRET = "722";
const VOICE = 2;
const EXTERNAL = 3;
const SCHEDULED = 1;
const COMPLETED = 3;
const NOT_RECURRING = 0;
const SEEN_AT = 1000;
const MORNING = DateTime.makeUnsafe("2026-11-10T09:00:00Z");
const EVENING = DateTime.makeUnsafe("2026-11-10T18:00:00Z");
const NOTHING = Option.getOrNull(Option.none<string>());
const INSERT_EVENT =
  "INSERT INTO scheduled_event (id, name, channelId, creatorId, location, entityType, status, startsAt, recurring, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
const INSERT_INTEREST =
  "INSERT INTO event_interest (eventId, userId, interestedAt) VALUES (?, ?, ?)";

const at = (moment: DateTime.Utc): number => DateTime.toEpochMillis(moment);

const SEEDED_EVENTS: readonly (readonly (string | number | null)[])[] = [
  [
    MOVIE,
    "Movie night",
    A_OPEN,
    ALICE,
    NOTHING,
    VOICE,
    SCHEDULED,
    at(EVENING),
    NOT_RECURRING,
    SEEN_AT,
  ],
  [
    MEETUP,
    "Meetup",
    NOTHING,
    BOB,
    "Shibuya",
    EXTERNAL,
    COMPLETED,
    at(MORNING),
    NOT_RECURRING,
    SEEN_AT,
  ],
  [
    SECRET,
    "Staff sync",
    A_STAFF,
    ALICE,
    NOTHING,
    VOICE,
    SCHEDULED,
    at(MORNING),
    NOT_RECURRING,
    SEEN_AT,
  ],
];

const Event = Schema.Struct({
  eventId: Schema.String,
  kind: Schema.String,
  status: Schema.String,
  interestedUserIds: Schema.Array(Schema.String),
});
const Page = Schema.Struct({
  ingest: Schema.String,
  total: Schema.Int,
  events: Schema.Array(Event),
  liveInterestedUserIds: Schema.NullOr(Schema.Array(Schema.String)),
});
const decodePage = Schema.decodeUnknownEffect(Page);

const listEvents = (args: Readonly<Record<string, unknown>>): Effect.Effect<typeof Page.Type> =>
  callTool({ name: "list_scheduled_events", args }).pipe(
    Effect.map(({ structured }) => Option.getOrUndefined(structured)),
    Effect.flatMap(decodePage),
    Effect.orDie,
  );

const seedEvents = (): Promise<void> =>
  runInDurableObject(guildStore(GUILD_A), (_store, state) => {
    for (const row of SEEDED_EVENTS) {
      state.storage.sql.exec(INSERT_EVENT, ...row);
    }
    state.storage.sql.exec(INSERT_INTEREST, MOVIE, CAROL, SEEN_AT);
  });

const INTERESTED_PATH = `${RouteBases.api}${Routes.guildScheduledEventUsers(GUILD_A, MOVIE)}`;

const discordInterested = http.get(INTERESTED_PATH, () =>
  HttpResponse.json([{ user_id: BOB }, { user_id: CAROL }]),
);

const network = setupNetwork();

beforeAll(() => {
  network.enable();
  network.use(discordMembers, discordInterested);
  return seedScenario().then(seedEvents);
});

afterAll(() => {
  network.disable();
});

it.effect("lists the events in channels you can see, soonest first", () =>
  Effect.gen(function* visible() {
    const page = yield* listEvents({ serverId: GUILD_A });
    expect(page).toStrictEqual({
      ingest: "consented",
      total: 2,
      events: [
        { eventId: MEETUP, kind: "external", status: "completed", interestedUserIds: [] },
        { eventId: MOVIE, kind: "voice", status: "scheduled", interestedUserIds: [CAROL] },
      ],
      liveInterestedUserIds: NOTHING,
    });
  }),
);

it.effect("keeps events a person created or is interested in", () =>
  Effect.gen(function* involved() {
    const { events } = yield* listEvents({ serverId: GUILD_A, userIds: [CAROL] });
    const ids = pipe(
      events,
      Array.map(({ eventId }) => eventId),
    );
    expect(ids).toStrictEqual([MOVIE]);
  }),
);

it.effect("adds who Discord lists as interested now for one event", () =>
  Effect.gen(function* live() {
    const { liveInterestedUserIds } = yield* listEvents({ serverId: GUILD_A, eventId: MOVIE });
    const hidden = yield* listEvents({ serverId: GUILD_A, eventId: SECRET });
    expect({ liveInterestedUserIds, hidden: hidden.liveInterestedUserIds }).toStrictEqual({
      liveInterestedUserIds: [BOB, CAROL],
      hidden: NOTHING,
    });
  }),
);

it.effect("returns nothing before the admin consents", () =>
  Effect.gen(function* notConsented() {
    const { ingest, total } = yield* listEvents({ serverId: GUILD_B });
    expect({ ingest, total }).toStrictEqual({ ingest: "notConsented", total: 0 });
  }),
);
