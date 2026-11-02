import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { RouteBases, Routes } from "discord-api-types/v10";
import { DateTime, Effect, Option, Schema } from "effect";
import { http, HttpResponse } from "msw";
import { afterAll, beforeAll, expect } from "vite-plus/test";

import { A_OPEN, A_STAFF_THREAD, discordMembers, GUILD_A, GUILD_B } from "./__tests__/scenario";
import { seedThreadScenario } from "./__tests__/thread-scenario";
import { callTool } from "./__tests__/tool-call";

const ALICE = "801";
const BOB = "802";
const CAROL = "803";
const OPEN_THREAD = "112";
const JOINED = DateTime.makeUnsafe("2026-11-02T09:00:00Z");
const LEFT = DateTime.makeUnsafe("2026-11-02T10:00:00Z");
const LATER = DateTime.makeUnsafe("2026-11-02T11:00:00Z");
const NOTHING = Option.getOrNull(Option.none<string>());
const STILL_THERE = Option.getOrNull(Option.none<number>());

const at = (moment: DateTime.Utc): number => DateTime.toEpochMillis(moment);

const Member = Schema.Struct({
  threadId: Schema.String,
  threadName: Schema.NullOr(Schema.String),
  userId: Schema.String,
  joinedAt: Schema.String,
  leftAt: Schema.NullOr(Schema.String),
});
const Page = Schema.Struct({
  ingest: Schema.String,
  total: Schema.Int,
  members: Schema.Array(Member),
  liveUserIds: Schema.NullOr(Schema.Array(Schema.String)),
});
const decodePage = Schema.decodeUnknownEffect(Page);

const listThreadMembers = (
  args: Readonly<Record<string, unknown>>,
): Effect.Effect<typeof Page.Type> =>
  callTool({ name: "list_thread_members", args }).pipe(
    Effect.map(({ structured }) => Option.getOrUndefined(structured)),
    Effect.flatMap(decodePage),
    Effect.orDie,
  );

const LIVE_PATH = `${RouteBases.api}${Routes.threadMembers(OPEN_THREAD)}`;

const discordThreadMembers = http.get(LIVE_PATH, () =>
  HttpResponse.json([{ user_id: ALICE }, { user_id: CAROL }]),
);

const network = setupNetwork();

const SEED = {
  thread: { id: OPEN_THREAD, name: "planning", parentId: A_OPEN },
  members: [
    [OPEN_THREAD, ALICE, at(JOINED), STILL_THERE],
    [OPEN_THREAD, BOB, at(JOINED), at(LEFT)],
    [OPEN_THREAD, CAROL, at(LATER), STILL_THERE],
    [A_STAFF_THREAD, ALICE, at(JOINED), STILL_THERE],
  ],
} as const;

beforeAll(() => {
  network.enable();
  network.use(discordMembers, discordThreadMembers);
  return seedThreadScenario(SEED);
});

afterAll(() => {
  network.disable();
});

it.effect("lists who is in the threads you can see, earliest join first", () =>
  Effect.gen(function* visible() {
    const page = yield* listThreadMembers({ serverId: GUILD_A });
    expect(page).toStrictEqual({
      ingest: "consented",
      total: 2,
      members: [
        {
          threadId: OPEN_THREAD,
          threadName: "planning",
          userId: ALICE,
          joinedAt: DateTime.formatIso(JOINED),
          leftAt: NOTHING,
        },
        {
          threadId: OPEN_THREAD,
          threadName: "planning",
          userId: CAROL,
          joinedAt: DateTime.formatIso(LATER),
          leftAt: NOTHING,
        },
      ],
      liveUserIds: NOTHING,
    });
  }),
);

it.effect("includes people who left when asked", () =>
  Effect.gen(function* left() {
    const { members } = yield* listThreadMembers({
      serverId: GUILD_A,
      userIds: [BOB],
      includeLeft: true,
    });
    expect(members).toStrictEqual([
      {
        threadId: OPEN_THREAD,
        threadName: "planning",
        userId: BOB,
        joinedAt: DateTime.formatIso(JOINED),
        leftAt: DateTime.formatIso(LEFT),
      },
    ]);
  }),
);

it.effect("adds who Discord lists in one thread now, but not for a hidden thread", () =>
  Effect.gen(function* live() {
    const shown = yield* listThreadMembers({ serverId: GUILD_A, threadId: OPEN_THREAD });
    const hidden = yield* listThreadMembers({ serverId: GUILD_A, threadId: A_STAFF_THREAD });
    expect({
      shown: shown.liveUserIds,
      hidden: hidden.liveUserIds,
      total: hidden.total,
    }).toStrictEqual({ shown: [ALICE, CAROL], hidden: NOTHING, total: 0 });
  }),
);

it.effect("returns nothing before the admin consents", () =>
  Effect.gen(function* notConsented() {
    const { ingest, total } = yield* listThreadMembers({ serverId: GUILD_B });
    expect({ ingest, total }).toStrictEqual({ ingest: "notConsented", total: 0 });
  }),
);
