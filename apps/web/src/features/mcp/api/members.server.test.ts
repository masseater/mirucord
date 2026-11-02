import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { Array, DateTime, Effect, Option, pipe, Schema } from "effect";
import { afterAll, beforeAll, expect } from "vite-plus/test";

import { seedMembers } from "./__tests__/member-seed";
import { discordMembers, GUILD_A, GUILD_B, MEMBER_ROLE, seedScenario } from "./__tests__/scenario";
import { callTool } from "./__tests__/tool-call";

const ALICE = "801";
const BOB = "802";
const CAROL = "803";
const ROLE_NAME = "メンバー";
const JOINED = DateTime.makeUnsafe("2026-09-01T00:00:00Z");
const LATER = DateTime.makeUnsafe("2026-09-10T00:00:00Z");
const LEFT = DateTime.makeUnsafe("2026-10-20T00:00:00Z");
const STILL_HERE = Option.getOrNull(Option.none<number>());
const NO_NICK = Option.getOrNull(Option.none<string>());

const Member = Schema.Struct({
  id: Schema.String,
  nick: Schema.NullOr(Schema.String),
  roles: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
  leftAt: Schema.NullOr(Schema.String),
});
const Members = Schema.Struct({
  ingest: Schema.String,
  total: Schema.Int,
  members: Schema.Array(Member),
});
const decodeMembers = Schema.decodeUnknownEffect(Members);

const listMembers = (args: Readonly<Record<string, unknown>>): Effect.Effect<typeof Members.Type> =>
  callTool({ name: "list_members", args }).pipe(
    Effect.map(({ structured }) => Option.getOrUndefined(structured)),
    Effect.flatMap(decodeMembers),
    Effect.orDie,
  );

const seeded = seedMembers({
  guildId: GUILD_A,
  members: [
    {
      userId: BOB,
      username: "bob",
      nick: NO_NICK,
      roles: [],
      joinedAt: DateTime.toEpochMillis(LATER),
      leftAt: STILL_HERE,
    },
    {
      userId: ALICE,
      username: "alice",
      nick: "ありす",
      roles: [MEMBER_ROLE],
      joinedAt: DateTime.toEpochMillis(JOINED),
      leftAt: STILL_HERE,
    },
    {
      userId: CAROL,
      username: "carol",
      nick: NO_NICK,
      roles: [],
      joinedAt: STILL_HERE,
      leftAt: DateTime.toEpochMillis(LEFT),
    },
  ],
  roleNames: { [MEMBER_ROLE]: ROLE_NAME },
  updatedAt: DateTime.toEpochMillis(LATER),
});

const network = setupNetwork();

beforeAll(() => {
  network.enable();
  network.use(discordMembers);
  return seedScenario().then(() => Effect.runPromise(seeded));
});

afterAll(() => {
  network.disable();
});

const idsOf = (members: readonly Readonly<{ id: string }>[]): readonly string[] =>
  pipe(
    members,
    Array.map(({ id }) => id),
  );

it.effect("lists the members still in the server, earliest join first, with role names", () =>
  Effect.gen(function* directory() {
    const { total, members } = yield* listMembers({ serverId: GUILD_A });
    expect({ total, ids: idsOf(members) }).toStrictEqual({ total: 2, ids: [ALICE, BOB] });
    expect(
      Array.head(members).pipe(Option.map(({ nick, roles }) => ({ nick, roles }))),
    ).toStrictEqual(Option.some({ nick: "ありす", roles: [{ id: MEMBER_ROLE, name: ROLE_NAME }] }));
  }),
);

it.effect("finds members by any of their names", () =>
  Effect.gen(function* byName() {
    const { members: byUsername } = yield* listMembers({ serverId: GUILD_A, query: "BO" });
    const { members: byNick } = yield* listMembers({ serverId: GUILD_A, query: "ありす" });
    expect({ byUsername: idsOf(byUsername), byNick: idsOf(byNick) }).toStrictEqual({
      byUsername: [BOB],
      byNick: [ALICE],
    });
  }),
);

it.effect("looks up people by ID, including those who left", () =>
  Effect.gen(function* byId() {
    const { members } = yield* listMembers({ serverId: GUILD_A, userIds: [CAROL] });
    expect(
      pipe(
        members,
        Array.map(({ id, leftAt }) => ({ id, leftAt })),
      ),
    ).toStrictEqual([{ id: CAROL, leftAt: DateTime.formatIso(LEFT) }]);
  }),
);

it.effect("returns no members before the admin consents", () =>
  Effect.gen(function* notConsented() {
    const { ingest, members } = yield* listMembers({ serverId: GUILD_B });
    expect({ ingest, members }).toStrictEqual({ ingest: "notConsented", members: [] });
  }),
);
