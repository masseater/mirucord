import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { DateTime, Effect, Option, Schema } from "effect";
import { afterAll, beforeAll, expect } from "vite-plus/test";

import { ListLinkedAccountsOutput } from "#/features/mcp/api/tool-output";

import { seedLinkedAccounts } from "./__tests__/linked-seed";
import type { SeedLink } from "./__tests__/linked-seed";
import { seedMembers } from "./__tests__/member-seed";
import type { SeedMember } from "./__tests__/member-seed";
import { discordMembers, GUILD_A, seedScenario } from "./__tests__/scenario";
import { callTool } from "./__tests__/tool-call";

const ALICE = "801";
const BOB = "802";
const CAROL = "803";
const JOINED = DateTime.makeUnsafe("2026-09-01T00:00:00Z");
const LEFT = DateTime.makeUnsafe("2026-10-20T00:00:00Z");
const PUBLISHED = DateTime.makeUnsafe("2026-11-02T09:00:00Z");
const STILL_HERE = Option.getOrNull(Option.none<number>());
const NO_NICK = Option.getOrNull(Option.none<string>());

const memberOf = (userId: string, leftAt: number | null): SeedMember => ({
  userId,
  username: userId,
  nick: NO_NICK,
  roles: [],
  joinedAt: DateTime.toEpochMillis(JOINED),
  leftAt,
});

const linkOf = (discordUserId: string, type: string, name: string): SeedLink => ({
  discordUserId,
  type,
  name,
  verified: true,
  publishedAt: DateTime.toEpochMillis(PUBLISHED),
});

const linkView = (
  type: string,
  name: string,
): (typeof ListLinkedAccountsOutput.Type)["people"][number]["accounts"][number] => ({
  type,
  name,
  verified: true,
  publishedAt: DateTime.formatIso(PUBLISHED),
});

const decodePeople = Schema.decodeUnknownEffect(ListLinkedAccountsOutput);

const listLinkedAccounts = (
  args: Readonly<Record<string, unknown>>,
): Effect.Effect<typeof ListLinkedAccountsOutput.Type> =>
  callTool({ name: "list_linked_accounts", args }).pipe(
    Effect.map(({ structured }) => Option.getOrUndefined(structured)),
    Effect.flatMap(decodePeople),
    Effect.orDie,
  );

const network = setupNetwork();

const MEMBERS = [
  memberOf(ALICE, STILL_HERE),
  memberOf(BOB, DateTime.toEpochMillis(LEFT)),
  memberOf(CAROL, STILL_HERE),
];

const LINKS = [
  linkOf(ALICE, "steam", "alice_s"),
  linkOf(ALICE, "github", "alice"),
  linkOf(BOB, "github", "bob"),
];

const SEEDED_AT = DateTime.toEpochMillis(PUBLISHED);

const seeded = Effect.promise(seedScenario).pipe(
  Effect.andThen(
    seedMembers({
      guildId: GUILD_A,
      members: MEMBERS,
      roleNames: {},
      updatedAt: SEEDED_AT,
    }),
  ),
  Effect.andThen(seedLinkedAccounts(LINKS)),
);

beforeAll(() => {
  network.enable();
  network.use(discordMembers);
  return Effect.runPromise(seeded);
});

afterAll(() => {
  network.disable();
});

it.effect("answers only current members who published accounts", () =>
  Effect.gen(function* published() {
    const page = yield* listLinkedAccounts({ serverId: GUILD_A, userIds: [ALICE, BOB, CAROL] });
    expect(page).toStrictEqual({
      ingest: "consented",
      people: [
        { userId: ALICE, accounts: [linkView("github", "alice"), linkView("steam", "alice_s")] },
      ],
    });
  }),
);
