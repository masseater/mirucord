import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { Array, DateTime, Effect, Option, pipe } from "effect";
import { http, HttpResponse } from "msw";
import { afterAll, beforeAll, expect } from "vite-plus/test";

import { seedMemberGuild, storedMembers } from "./__tests__/stored-members";
import type { StoredRow } from "./__tests__/stored-members";
import { departGatewayMembers, storeGatewayMembers, syncMembers } from "./store-members.server";

const GUILD = "800";
const QUIET_GUILD = "810";
const ALICE = "801";
const BOB = "802";
const NOTICE_CHANNEL = "820";
const JOINED = "2026-09-01T00:00:00.000Z";
const JOINED_AT = DateTime.toEpochMillis(DateTime.makeUnsafe(JOINED));
const STILL_HERE = Option.getOrNull(Option.none<number>());
const NO_CONSENT = Option.getOrNull(Option.none<string>());

const LISTED = [
  {
    user: { id: ALICE, username: "alice", global_name: "アリス" },
    nick: "ありす",
    roles: ["850"],
    joined_at: JOINED,
  },
  { user: { id: BOB, username: "bob" }, roles: [], joined_at: JOINED },
];

const network = setupNetwork();

beforeAll(() => {
  network.enable();
  network.use(
    http.get("https://discord.com/api/v10/guilds/:guildId/members", () =>
      HttpResponse.json(LISTED),
    ),
  );
  return Effect.runPromise(
    Effect.all([
      seedMemberGuild({ id: GUILD, noticeChannelId: NOTICE_CHANNEL }),
      seedMemberGuild({ id: QUIET_GUILD, noticeChannelId: NO_CONSENT }),
    ]),
  );
});

afterAll(() => {
  network.disable();
});

const idsOf = (members: readonly StoredRow[]): readonly string[] =>
  pipe(
    members,
    Array.map(({ userId }) => userId),
  );

it.effect("stores the member list of a consented server", () =>
  Effect.gen(function* listed() {
    yield* syncMembers(GUILD);
    const members = yield* storedMembers({ guildId: GUILD, includeLeft: false });
    expect(
      pipe(
        members,
        Array.map(({ userId, roles }) => ({ userId, roles })),
      ),
    ).toStrictEqual([
      { userId: ALICE, roles: ["850"] },
      { userId: BOB, roles: [] },
    ]);
  }),
);

it.effect("keeps the join time when an update does not carry it", () =>
  Effect.gen(function* updated() {
    yield* syncMembers(GUILD);
    yield* storeGatewayMembers({
      kind: "members",
      guildId: GUILD,
      members: [{ user: { id: BOB, username: "bob" }, nick: "ぼぶ", roles: ["850"] }],
    });
    const members = yield* storedMembers({ guildId: GUILD, includeLeft: false });
    expect(Array.findFirst(members, ({ userId }) => userId === BOB)).toMatchObject(
      Option.some({
        roles: ["850"],
        joinedAt: JOINED_AT,
      }),
    );
  }),
);

it.effect("marks people who left instead of forgetting them", () =>
  Effect.gen(function* departed() {
    yield* syncMembers(GUILD);
    yield* departGatewayMembers({ kind: "depart", guildId: GUILD, userIds: [ALICE] });
    const present = yield* storedMembers({ guildId: GUILD, includeLeft: false });
    const everyone = yield* storedMembers({ guildId: GUILD, includeLeft: true });
    const left = pipe(
      everyone,
      Array.filter(({ leftAt }) => leftAt !== STILL_HERE),
    );
    expect({
      present: idsOf(present),
      left: idsOf(left),
    }).toStrictEqual({ present: [BOB], left: [ALICE] });
  }),
);

it.effect("stores nothing for a server whose admin has not consented", () =>
  Effect.gen(function* quiet() {
    yield* syncMembers(QUIET_GUILD);
    expect(yield* storedMembers({ guildId: QUIET_GUILD, includeLeft: true })).toStrictEqual([]);
  }),
);
