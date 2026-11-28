import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { runInDurableObject } from "cloudflare:test";
import { Array, DateTime, Effect, Option, pipe, Schema } from "effect";
import { afterAll, beforeAll, expect } from "vite-plus/test";

import { guildStore } from "#/entities/guild-message/index.server";
import {
  A_OPEN,
  A_STAFF,
  discordMembers,
  GUILD_A,
  GUILD_B,
  seedScenario,
  userToolCaller,
} from "#/entities/guild-message/index.test.support";

import { registerListVoiceSessions } from "./list-voice-sessions.server.ts";

const callTool = userToolCaller([registerListVoiceSessions]);

const ALICE = "801";
const BOB = "802";
const MORNING = DateTime.makeUnsafe("2026-11-01T09:00:00Z");
const NOON = DateTime.makeUnsafe("2026-11-01T12:00:00Z");
const EVENING = DateTime.makeUnsafe("2026-11-01T18:00:00Z");
const STILL_THERE = Option.getOrNull(Option.none<number>());
const INSERT_SESSION =
  "INSERT INTO voice_session (userId, channelId, joinedAt, joinPrecision, leftAt, leavePrecision) VALUES (?, ?, ?, ?, ?, ?)";

const SEEDED_SESSIONS: readonly (readonly (string | number | null)[])[] = [
  [ALICE, A_OPEN, DateTime.toEpochMillis(MORNING), "exact", DateTime.toEpochMillis(NOON), "exact"],
  [BOB, A_OPEN, DateTime.toEpochMillis(NOON), "noLaterThan", STILL_THERE, STILL_THERE],
  [ALICE, A_STAFF, DateTime.toEpochMillis(EVENING), "exact", STILL_THERE, STILL_THERE],
];

const Moment = Schema.Struct({ at: Schema.String, precision: Schema.String });
const Session = Schema.Struct({
  userId: Schema.String,
  channelId: Schema.String,
  joined: Moment,
  left: Schema.NullOr(Moment),
});
const Sessions = Schema.Struct({
  ingest: Schema.String,
  total: Schema.Int,
  nextCursor: Schema.optionalKey(Schema.String),
  sessions: Schema.Array(Session),
});
const decodeSessions = Schema.decodeUnknownEffect(Sessions);

const listVoice = (args: Readonly<Record<string, unknown>>): Effect.Effect<typeof Sessions.Type> =>
  callTool({ name: "list_voice_sessions", args }).pipe(
    Effect.map(({ structured }) => Option.getOrUndefined(structured)),
    Effect.flatMap(decodeSessions),
    Effect.orDie,
  );

const seedSessions = (): Promise<void> =>
  runInDurableObject(guildStore(GUILD_A), (_store, state) => {
    for (const row of SEEDED_SESSIONS) {
      state.storage.sql.exec(INSERT_SESSION, ...row);
    }
  });

const network = setupNetwork();

beforeAll(() => {
  network.enable();
  network.use(discordMembers);
  return seedScenario().then(seedSessions);
});

afterAll(() => {
  network.disable();
});

const usersOf = (sessions: (typeof Sessions.Type)["sessions"]): readonly string[] =>
  pipe(
    sessions,
    Array.map(({ userId }) => userId),
  );

it.effect("lists voice sessions in the channels you can see, newest join first", () =>
  Effect.gen(function* visible() {
    const { total, sessions } = yield* listVoice({ serverId: GUILD_A });
    expect({ total, sessions }).toStrictEqual({
      total: 2,
      sessions: [
        {
          userId: BOB,
          channelId: A_OPEN,
          joined: { at: DateTime.formatIso(NOON), precision: "noLaterThan" },
          left: STILL_THERE,
        },
        {
          userId: ALICE,
          channelId: A_OPEN,
          joined: { at: DateTime.formatIso(MORNING), precision: "exact" },
          left: { at: DateTime.formatIso(NOON), precision: "exact" },
        },
      ],
    });
  }),
);

it.effect("keeps the sessions of the given people that overlap a span", () =>
  Effect.gen(function* narrowed() {
    const { sessions: afterNoon } = yield* listVoice({
      serverId: GUILD_A,
      since: DateTime.formatIso(EVENING),
    });
    const { sessions: alice } = yield* listVoice({ serverId: GUILD_A, userIds: [ALICE] });
    expect({ afterNoon: usersOf(afterNoon), alice: usersOf(alice) }).toStrictEqual({
      afterNoon: [BOB],
      alice: [ALICE],
    });
  }),
);

it.effect("returns no sessions before the admin consents", () =>
  Effect.gen(function* notConsented() {
    const { ingest, sessions } = yield* listVoice({ serverId: GUILD_B });
    expect({ ingest, sessions }).toStrictEqual({ ingest: "notConsented", sessions: [] });
  }),
);

it.effect("pages with the nextCursor until the last page has none", () =>
  Effect.gen(function* paged() {
    const first = yield* listVoice({ serverId: GUILD_A, limit: 1 });
    const second = yield* listVoice({ serverId: GUILD_A, limit: 1, cursor: first.nextCursor });
    expect({
      first: usersOf(first.sessions),
      second: usersOf(second.sessions),
      hasMore: [
        Option.isSome(Option.fromUndefinedOr(first.nextCursor)),
        Option.isSome(Option.fromUndefinedOr(second.nextCursor)),
      ],
    }).toStrictEqual({ first: [BOB], second: [ALICE], hasMore: [true, false] });
  }),
);

it.effect("refuses a cursor that was not made by this tool", () =>
  Effect.gen(function* forged() {
    const { isError } = yield* callTool({
      name: "list_voice_sessions",
      args: { serverId: GUILD_A, cursor: "not-a-cursor" },
    });
    expect(isError).toBe(true);
  }),
);
