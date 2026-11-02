import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { runInDurableObject } from "cloudflare:test";
import { RouteBases, Routes } from "discord-api-types/v10";
import { DateTime, Effect, Option, Schema } from "effect";
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
const POST = "811";
const POLL = "812";
const GONE = "813";
const SECRET = "814";
const ANSWER = 1;
const NOT_BURST = 0;
const NOT_FOUND = 404;
const MORNING = DateTime.makeUnsafe("2026-11-01T09:00:00Z");
const NOON = DateTime.makeUnsafe("2026-11-01T12:00:00Z");
const NO_LIVE = Option.getOrNull(Option.none());
const NO_EMOJI_ID = Option.getOrNull(Option.none<string>());
const INSERT_REACTION =
  "INSERT INTO reaction (messageId, channelId, userId, messageAuthorId, emoji, burst, reactedAt) VALUES (?, ?, ?, ?, ?, ?, ?)";
const INSERT_VOTE =
  "INSERT INTO poll_vote (messageId, channelId, userId, answerId, votedAt) VALUES (?, ?, ?, ?, ?)";

const at = (moment: DateTime.Utc): number => DateTime.toEpochMillis(moment);

const SEEDED_REACTIONS: readonly (readonly (string | number)[])[] = [
  [POST, A_OPEN, ALICE, BOB, "👍", NOT_BURST, at(MORNING)],
  [POST, A_OPEN, CAROL, BOB, "miku:555", NOT_BURST, at(NOON)],
  [SECRET, A_STAFF, ALICE, BOB, "👍", NOT_BURST, at(NOON)],
];

const Page = Schema.Struct({
  ingest: Schema.String,
  reactionTotal: Schema.Int,
  reactions: Schema.Array(
    Schema.Struct({ messageId: Schema.String, userId: Schema.String, emoji: Schema.String }),
  ),
  voteTotal: Schema.Int,
  votes: Schema.Array(Schema.Struct({ userId: Schema.String, answerId: Schema.Int })),
  live: Schema.NullOr(Schema.Unknown),
});
const decodePage = Schema.decodeUnknownEffect(Page);

const listReactions = (args: Readonly<Record<string, unknown>>): Effect.Effect<typeof Page.Type> =>
  callTool({ name: "list_reactions", args }).pipe(
    Effect.map(({ structured }) => Option.getOrUndefined(structured)),
    Effect.flatMap(decodePage),
    Effect.orDie,
  );

const seedReactions = (): Promise<void> =>
  runInDurableObject(guildStore(GUILD_A), (_store, state) => {
    for (const row of SEEDED_REACTIONS) {
      state.storage.sql.exec(INSERT_REACTION, ...row);
    }
    state.storage.sql.exec(INSERT_VOTE, POLL, A_OPEN, CAROL, ANSWER, at(NOON));
  });

const api = (path: string): string => `${RouteBases.api}${decodeURIComponent(path)}`;

const discordPoll = [
  http.get(api(Routes.channelMessage(A_OPEN, POLL)), () =>
    HttpResponse.json({
      author: { id: BOB },
      reactions: [
        { emoji: { id: NO_EMOJI_ID, name: "👍" }, count_details: { burst: 0, normal: 2 } },
      ],
      poll: { answers: [{ answer_id: ANSWER, poll_media: { text: "Yes" } }] },
    }),
  ),
  http.get(api(Routes.channelMessageReaction(A_OPEN, POLL, ":emoji")), () =>
    HttpResponse.json([{ id: ALICE }, { id: CAROL }]),
  ),
  http.get(api(Routes.pollAnswerVoters(A_OPEN, POLL, ANSWER)), () =>
    HttpResponse.json({ users: [{ id: CAROL }] }),
  ),
  http.get(api(Routes.channelMessage(A_OPEN, GONE)), () =>
    HttpResponse.json({ message: "Unknown Message" }, { status: NOT_FOUND }),
  ),
];

const network = setupNetwork();

beforeAll(() => {
  network.enable();
  network.use(discordMembers, ...discordPoll);
  return seedScenario().then(seedReactions);
});

afterAll(() => {
  network.disable();
});

it.effect("lists reactions and votes in the channels you can see, newest first", () =>
  Effect.gen(function* visible() {
    const page = yield* listReactions({ serverId: GUILD_A });
    expect(page).toStrictEqual({
      ingest: "consented",
      reactionTotal: 2,
      reactions: [
        { messageId: POST, userId: CAROL, emoji: "miku:555" },
        { messageId: POST, userId: ALICE, emoji: "👍" },
      ],
      voteTotal: 1,
      votes: [{ userId: CAROL, answerId: ANSWER }],
      live: NO_LIVE,
    });
  }),
);

it.effect("narrows to who reacted and to whose messages got reactions", () =>
  Effect.gen(function* narrowed() {
    const alice = yield* listReactions({ serverId: GUILD_A, userIds: [ALICE] });
    const toCarol = yield* listReactions({ serverId: GUILD_A, authorIds: [CAROL] });
    expect({ alice: alice.reactionTotal, toCarol: toCarol.reactionTotal }).toStrictEqual({
      alice: 1,
      toCarol: 0,
    });
  }),
);

it.effect("adds what Discord shows on a message now", () =>
  Effect.gen(function* live() {
    const { live: shown } = yield* listReactions({
      serverId: GUILD_A,
      message: { channelId: A_OPEN, messageId: POLL },
    });
    const { live: gone } = yield* listReactions({
      serverId: GUILD_A,
      message: { channelId: A_OPEN, messageId: GONE },
    });
    expect({ shown, gone }).toStrictEqual({
      shown: {
        authorId: BOB,
        reactions: [{ emoji: "👍", burst: false, userIds: [ALICE, CAROL] }],
        votes: [{ answerId: ANSWER, text: "Yes", userIds: [CAROL] }],
      },
      gone: NO_LIVE,
    });
  }),
);

it.effect("refuses a message in a channel you cannot see", () =>
  Effect.gen(function* hidden() {
    const { isError } = yield* callTool({
      name: "list_reactions",
      args: { serverId: GUILD_A, message: { channelId: A_STAFF, messageId: SECRET } },
    }).pipe(Effect.orDie);
    expect(isError).toBe(true);
  }),
);

it.effect("returns nothing before the admin consents", () =>
  Effect.gen(function* notConsented() {
    const { ingest, reactionTotal } = yield* listReactions({ serverId: GUILD_B });
    expect({ ingest, reactionTotal }).toStrictEqual({ ingest: "notConsented", reactionTotal: 0 });
  }),
);
