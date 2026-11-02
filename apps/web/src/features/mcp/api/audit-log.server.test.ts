import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { DateTime, Effect, Option, Schema } from "effect";
import { afterAll, beforeAll, expect } from "vite-plus/test";

import { grantAuditLog, seedAuditScenario } from "./__tests__/audit-scenario";
import { discordMembers, GUILD_A } from "./__tests__/scenario";
import { callTool } from "./__tests__/tool-call";

const ALICE = "801";
const BOB = "802";
const CAROL = "803";
const KICK = 20;
const ROLE_UPDATE = 25;
const EARLY = DateTime.makeUnsafe("2026-11-02T09:00:00Z");
const LATE = DateTime.makeUnsafe("2026-11-02T10:00:00Z");
const NOTHING = Option.getOrNull(Option.none<string>());
const ONE_ROLE_UPDATE = 1;

const at = (moment: DateTime.Utc): number => DateTime.toEpochMillis(moment);

const ROLE_CHANGES = [{ key: "$add", new_value: [{ id: "150", name: "member" }] }];

const ENTRIES = [
  {
    id: "1",
    actionType: ROLE_UPDATE,
    userId: ALICE,
    targetId: BOB,
    at: at(EARLY),
    detail: JSON.stringify({ reason: NOTHING, changes: ROLE_CHANGES }),
  },
  {
    id: "2",
    actionType: KICK,
    userId: ALICE,
    targetId: CAROL,
    at: at(LATE),
    detail: JSON.stringify({ reason: "spam" }),
  },
];

const Entry = Schema.Struct({
  entryId: Schema.String,
  action: Schema.String,
  userId: Schema.NullOr(Schema.String),
  targetId: Schema.NullOr(Schema.String),
  at: Schema.String,
  reason: Schema.NullOr(Schema.String),
  changes: Schema.Unknown,
  options: Schema.Unknown,
});
const Page = Schema.Struct({
  ingest: Schema.String,
  total: Schema.Int,
  entries: Schema.Array(Entry),
});
const decodePage = Schema.decodeUnknownEffect(Page);

type Called = Readonly<{ isError: boolean; page: Option.Option<typeof Page.Type> }>;

const listAuditLog = (args: Readonly<Record<string, unknown>>): Effect.Effect<Called> =>
  callTool({ name: "list_audit_log", args }).pipe(
    Effect.flatMap(({ isError, structured }) => {
      const decoded = decodePage(Option.getOrUndefined(structured));
      return Effect.map(Effect.option(decoded), (page) => ({ isError, page }));
    }),
    Effect.orDie,
  );

const network = setupNetwork();

beforeAll(() => {
  network.enable();
  network.use(discordMembers);
  return seedAuditScenario(ENTRIES);
});

afterAll(() => {
  network.disable();
});

it.effect("refuses people without the View Audit Log permission", () =>
  Effect.gen(function* refused() {
    const { isError } = yield* listAuditLog({ serverId: GUILD_A });
    expect(isError).toBe(true);
  }),
);

it.effect("lists who did what to whom, newest first, once the permission is granted", () =>
  Effect.gen(function* granted() {
    yield* Effect.promise(grantAuditLog);
    const all = yield* listAuditLog({ serverId: GUILD_A });
    const roles = yield* listAuditLog({ serverId: GUILD_A, actions: ["member_role_update"] });
    expect(Option.getOrThrow(all.page)).toStrictEqual({
      ingest: "consented",
      total: 2,
      entries: [
        {
          entryId: "2",
          action: "member_kick",
          userId: ALICE,
          targetId: CAROL,
          at: DateTime.formatIso(LATE),
          reason: "spam",
          changes: NOTHING,
          options: NOTHING,
        },
        {
          entryId: "1",
          action: "member_role_update",
          userId: ALICE,
          targetId: BOB,
          at: DateTime.formatIso(EARLY),
          reason: NOTHING,
          changes: ROLE_CHANGES,
          options: NOTHING,
        },
      ],
    });
    expect(Option.getOrThrow(roles.page).total).toBe(ONE_ROLE_UPDATE);
  }),
);
