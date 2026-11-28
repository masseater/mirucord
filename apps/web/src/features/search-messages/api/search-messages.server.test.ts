import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { env } from "cloudflare:workers";
import { Array, Effect, Option, pipe, Schema } from "effect";
import { afterAll, beforeAll, beforeEach, expect, vi } from "vite-plus/test";

import {
  A_OPEN,
  A_OPEN_MESSAGE,
  A_STAFF,
  discordMembers,
  GUILD_A,
  SAME_WORDS,
  seedScenario,
  userToolCaller,
} from "#/entities/guild-message/index.test.support";
import { SearchMessagesOutput } from "#/features/search-messages/model/search-output";
import { spendNeurons } from "#/shared/ai/index.server";

import { registerSearchMessages } from "./search-messages.server.ts";
import {
  answerEmbedding,
  drainAlarms,
  embeddedTexts,
  writeMessages,
} from "./similar-guild.test.support.ts";

const callTool = userToolCaller([registerSearchMessages]);

const RAMEN = "81";
const CAT = "82";
const STAFF_RAMEN = "83";
const LATE = "84";
const ALLOWANCE_BITS = 48;
const HIGHEST_BIT = 15;
const BINARY = 2;
const ONCE = 1;
const NOTHING = 0;
const SECOND_PAGE = "eyJvZmZzZXQiOjF9";

const spendWholeAllowance = Effect.forEach(
  Array.makeBy(ALLOWANCE_BITS, (step) => BINARY ** (HIGHEST_BIT - step)),
  (neurons) => spendNeurons("query", neurons),
  { concurrency: 1, discard: true },
);

const decodeSimilar = Schema.decodeUnknownEffect(SearchMessagesOutput);

const findSimilar = (query: string): Effect.Effect<typeof SearchMessagesOutput.Type> =>
  callTool({ name: "search_messages", args: { serverId: GUILD_A, query } }).pipe(
    Effect.flatMap(({ structured }) => structured.pipe(Option.getOrUndefined, decodeSimilar)),
    Effect.orDie,
  );

const network = setupNetwork();

beforeAll(() => {
  network.enable();
  network.use(discordMembers);
  return seedScenario();
});

beforeEach(() => {
  embeddedTexts.length = NOTHING;
  vi.spyOn(env.AI, "run").mockImplementation((_model, inputs) => answerEmbedding(inputs));
});

afterAll(() => {
  network.disable();
});

it.live("finds messages by meaning only in the channels the user can read", () =>
  Effect.gen(function* byMeaning() {
    yield* writeMessages([
      { id: RAMEN, channelId: A_OPEN, content: "昨日のラーメンうまかった" },
      { id: CAT, channelId: A_OPEN, content: "うちの猫が寝てる" },
      { id: STAFF_RAMEN, channelId: A_STAFF, content: "ラーメン屋の裏話" },
    ]);
    yield* drainAlarms;
    const found = yield* findSimilar("麺類の話をしていたのは？");
    const ids = pipe(
      found.messages,
      Array.map(({ id }) => id),
    );
    expect(Array.head(ids)).toStrictEqual(Option.some(RAMEN));
    expect(ids).toContain(CAT);
    expect(ids).not.toContain(STAFF_RAMEN);
    expect(found.embedded).toBe(found.stored);
    expect(found.meaning).toBe("included");
  }),
);

it.live("reuses the vector of a query it has already embedded", () =>
  Effect.gen(function* cachedQuery() {
    const query = "猫の写真ある？";
    yield* findSimilar(query);
    yield* findSimilar(query);
    expect(
      pipe(
        embeddedTexts,
        Array.filter((text) => text === query),
      ),
    ).toHaveLength(ONCE);
  }),
);

it.live("leaves embedding to the next day once the day's allowance is spent", () =>
  Effect.gen(function* overBudget() {
    yield* spendWholeAllowance;
    const answered = yield* findSimilar("まだ聞いていない質問");
    expect(answered.meaning).toBe("overBudget");
    expect(answered.messages).toStrictEqual([]);
    yield* writeMessages([{ id: LATE, channelId: A_OPEN, content: "ラーメンの新店" }]);
    yield* drainAlarms;
    expect(embeddedTexts).toStrictEqual([]);
  }),
);

it.live("lists an exact match once, first, and leaves it out of the meaning matches", () =>
  Effect.gen(function* merged() {
    const found = yield* findSimilar(SAME_WORDS);
    const exact = pipe(
      found.messages,
      Array.filter(({ id }) => id === A_OPEN_MESSAGE),
    );
    expect(
      pipe(
        exact,
        Array.map(({ match }) => match),
      ),
    ).toStrictEqual(["exact"]);
    expect(Array.head(found.messages).pipe(Option.map(({ id }) => id))).toStrictEqual(
      Option.some(A_OPEN_MESSAGE),
    );
    expect(found.nextCursor).toBeNull();
  }),
);

it.live("refuses a cursor it did not hand out", () =>
  Effect.gen(function* badCursor() {
    const refused = yield* callTool({
      name: "search_messages",
      args: { serverId: GUILD_A, query: SAME_WORDS, cursor: "not-a-cursor" },
    });
    expect(refused.isError).toBe(true);
  }),
);

it.live("leaves meaning matches to the first page", () =>
  Effect.gen(function* laterPage() {
    const later = yield* callTool({
      name: "search_messages",
      args: { serverId: GUILD_A, query: SAME_WORDS, cursor: SECOND_PAGE },
    }).pipe(
      Effect.flatMap(({ structured }) => structured.pipe(Option.getOrUndefined, decodeSimilar)),
      Effect.orDie,
    );
    expect(later.meaning).toBe("firstPageOnly");
    expect(later.embedded).toBeNull();
  }),
);
