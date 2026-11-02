import { it } from "@effect/vitest";
import { runInDurableObject } from "cloudflare:test";
import { Effect, Option, Schema } from "effect";
import { beforeAll, expect } from "vite-plus/test";

import { guildStore } from "#/entities/guild-message/index.server";

import { seedMemberGuild } from "./__tests__/stored-members";
import { storeGatewayReactions } from "./store-activity.server";

const REACTING_GUILD = "870";
const QUIET_GUILD = "880";
const NOTICE_CHANNEL = "820";
const ALICE = "801";
const BOB = "802";
const CAROL = "803";
const CHANNEL = "890";
const POST = "891";
const POLL = "892";
const REACTED_AT = 1000;
const LATER = 2000;
const NOT_BURST = 0;
const ANSWER = 1;
const NO_CONSENT = Option.getOrNull(Option.none<string>());
const ALL_EMOJI = Option.getOrNull(Option.none<string>());

const ReactionRow = Schema.Struct({
  messageId: Schema.String,
  userId: Schema.String,
  messageAuthorId: Schema.NullOr(Schema.String),
  emoji: Schema.String,
  burst: Schema.Finite,
  reactedAt: Schema.Finite,
});
const VoteRow = Schema.Struct({
  messageId: Schema.String,
  userId: Schema.String,
  answerId: Schema.Finite,
});
const Stored = Schema.Struct({
  reactions: Schema.Array(ReactionRow),
  votes: Schema.Array(VoteRow),
});
const decodeStored = Schema.decodeUnknownEffect(Stored);
const SELECT_REACTIONS =
  "SELECT messageId, userId, messageAuthorId, emoji, burst, reactedAt FROM reaction ORDER BY userId, emoji";
const SELECT_VOTES = "SELECT messageId, userId, answerId FROM poll_vote ORDER BY userId";

const storedOf = (guildId: string): Effect.Effect<typeof Stored.Type> =>
  Effect.promise(() =>
    runInDurableObject(guildStore(guildId), (_store, state) => ({
      reactions: state.storage.sql.exec(SELECT_REACTIONS).toArray(),
      votes: state.storage.sql.exec(SELECT_VOTES).toArray(),
    })),
  ).pipe(Effect.flatMap(decodeStored), Effect.orDie);

const ON_POST = { channelId: CHANNEL, messageId: POST };
const ON_POLL = { channelId: CHANNEL, messageId: POLL };

beforeAll(() =>
  Effect.runPromise(
    Effect.all([
      seedMemberGuild({ id: REACTING_GUILD, noticeChannelId: NOTICE_CHANNEL }),
      seedMemberGuild({ id: QUIET_GUILD, noticeChannelId: NO_CONSENT }),
    ]),
  ),
);

it.effect("keeps who reacts and votes as reactions come and go", () =>
  Effect.gen(function* reacting() {
    const add = { kind: "add", ...ON_POST, at: REACTED_AT, messageAuthorId: CAROL } as const;
    yield* storeGatewayReactions({
      kind: "reactions",
      guildId: REACTING_GUILD,
      changes: [
        { ...add, userId: ALICE, emoji: "👍", burst: false },
        { ...add, userId: ALICE, emoji: "miku:555", burst: false },
        { ...add, userId: BOB, emoji: "👍", burst: false },
        { kind: "remove", ...ON_POST, at: LATER, userId: BOB, emoji: "👍", burst: false },
        { kind: "clear", ...ON_POST, at: LATER, emoji: "miku:555" },
        { kind: "vote", ...ON_POLL, at: REACTED_AT, userId: ALICE, answerId: ANSWER },
        { kind: "vote", ...ON_POLL, at: REACTED_AT, userId: BOB, answerId: ANSWER },
        { kind: "unvote", ...ON_POLL, at: LATER, userId: BOB, answerId: ANSWER },
      ],
    });
    expect(yield* storedOf(REACTING_GUILD)).toStrictEqual({
      reactions: [
        {
          messageId: POST,
          userId: ALICE,
          messageAuthorId: CAROL,
          emoji: "👍",
          burst: NOT_BURST,
          reactedAt: REACTED_AT,
        },
      ],
      votes: [{ messageId: POLL, userId: ALICE, answerId: ANSWER }],
    });
  }),
);

it.effect("clears every emoji of a message at once", () =>
  Effect.gen(function* clearing() {
    yield* storeGatewayReactions({
      kind: "reactions",
      guildId: REACTING_GUILD,
      changes: [{ kind: "clear", ...ON_POST, at: LATER, emoji: ALL_EMOJI }],
    });
    const { reactions } = yield* storedOf(REACTING_GUILD);
    expect(reactions).toStrictEqual([]);
  }),
);

it.effect("records no reactions before the admin consents", () =>
  Effect.gen(function* quiet() {
    yield* storeGatewayReactions({
      kind: "reactions",
      guildId: QUIET_GUILD,
      changes: [
        {
          kind: "add",
          ...ON_POST,
          at: REACTED_AT,
          userId: ALICE,
          messageAuthorId: CAROL,
          emoji: "👍",
          burst: false,
        },
      ],
    });
    expect(yield* storedOf(QUIET_GUILD)).toStrictEqual({ reactions: [], votes: [] });
  }),
);
