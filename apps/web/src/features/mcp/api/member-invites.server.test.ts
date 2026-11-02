import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { runInDurableObject } from "cloudflare:test";
import { DateTime, Effect, Option, Schema } from "effect";
import { afterAll, beforeAll, expect } from "vite-plus/test";

import { guildStore } from "#/entities/guild-message/index.server";

import { grantManageGuild } from "./__tests__/audit-scenario";
import { discordMembers, GUILD_A, seedScenario } from "./__tests__/scenario";
import { callTool } from "./__tests__/tool-call";

const INVITER = "801";
const BOB = "802";
const CAROL = "803";
const CHANNEL = "820";
const EARLY = DateTime.makeUnsafe("2026-11-02T09:00:00Z");
const ONE_JOIN = 1;
const LATE = DateTime.makeUnsafe("2026-11-02T10:00:00Z");

const INSERT_JOIN =
  "INSERT INTO invite_join (userId, joinedAt, precision, candidates) VALUES (?, ?, ?, ?)";

const CANDIDATE = { code: "abc", inviterId: INVITER, channelId: CHANNEL };

const JOINS = [
  [BOB, DateTime.toEpochMillis(EARLY), "exact", JSON.stringify([CANDIDATE])],
  [CAROL, DateTime.toEpochMillis(LATE), "unknown", JSON.stringify([])],
];

const Page = Schema.Struct({
  ingest: Schema.String,
  total: Schema.Int,
  joins: Schema.Array(Schema.Unknown),
});
const decodePage = Schema.decodeUnknownEffect(Page);

type Called = Readonly<{ isError: boolean; page: Option.Option<typeof Page.Type> }>;

const listMemberInvites = (args: Readonly<Record<string, unknown>>): Effect.Effect<Called> =>
  callTool({ name: "list_member_invites", args }).pipe(
    Effect.flatMap(({ isError, structured }) => {
      const decoded = decodePage(Option.getOrUndefined(structured));
      return Effect.map(Effect.option(decoded), (page) => ({ isError, page }));
    }),
    Effect.orDie,
  );

const insertJoins = (): Promise<void> =>
  runInDurableObject(guildStore(GUILD_A), (_store, state) => {
    for (const join of JOINS) {
      state.storage.sql.exec(INSERT_JOIN, ...join);
    }
  });

const joinsInserted = Effect.promise(insertJoins);

const seedJoins = (): Promise<void> =>
  Effect.runPromise(Effect.promise(seedScenario).pipe(Effect.andThen(joinsInserted)));

const network = setupNetwork();

beforeAll(() => {
  network.enable();
  network.use(discordMembers);
  return seedJoins();
});

afterAll(() => {
  network.disable();
});

it.effect("refuses people without the Manage Server permission", () =>
  Effect.gen(function* refused() {
    const { isError } = yield* listMemberInvites({ serverId: GUILD_A });
    expect(isError).toBe(true);
  }),
);

it.effect("lists which invite each person joined through, newest first, for managers", () =>
  Effect.gen(function* granted() {
    yield* Effect.promise(grantManageGuild);
    const all = yield* listMemberInvites({ serverId: GUILD_A });
    const bob = yield* listMemberInvites({ serverId: GUILD_A, userIds: [BOB] });
    expect(Option.getOrThrow(all.page)).toStrictEqual({
      ingest: "consented",
      total: 2,
      joins: [
        { userId: CAROL, joinedAt: DateTime.formatIso(LATE), precision: "unknown", invites: [] },
        {
          userId: BOB,
          joinedAt: DateTime.formatIso(EARLY),
          precision: "exact",
          invites: [CANDIDATE],
        },
      ],
    });
    expect(Option.getOrThrow(bob.page).total).toBe(ONE_JOIN);
  }),
);
