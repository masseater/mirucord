import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { env } from "cloudflare:workers";
import { Array, Effect, Option, pipe, Schema } from "effect";
import { afterAll, beforeAll, beforeEach, expect, vi } from "vite-plus/test";

import { spendNeurons } from "#/shared/ai/index.server";

import { A_OPEN, A_STAFF, discordMembers, GUILD_A, seedScenario } from "./__tests__/scenario";
import {
  answerEmbedding,
  drainAlarms,
  embeddedTexts,
  writeMessages,
} from "./__tests__/similar-guild";
import { callTool } from "./__tests__/tool-call";
import { FindSimilarMessagesOutput } from "./tool-output";

const RAMEN = "81";
const CAT = "82";
const STAFF_RAMEN = "83";
const LATE = "84";
const ALLOWANCE_BITS = 48;
const HIGHEST_BIT = 15;
const BINARY = 2;
const ONCE = 1;
const NOTHING = 0;

const spendWholeAllowance = Effect.forEach(
  Array.makeBy(ALLOWANCE_BITS, (step) => BINARY ** (HIGHEST_BIT - step)),
  (neurons) => spendNeurons("query", neurons),
  { discard: true },
);

const decodeSimilar = Schema.decodeUnknownEffect(FindSimilarMessagesOutput);

const findSimilar = (query: string): Effect.Effect<typeof FindSimilarMessagesOutput.Type> =>
  callTool({ name: "find_similar_messages", args: { serverId: GUILD_A, query } }).pipe(
    Effect.flatMap(({ structured }) => decodeSimilar(Option.getOrUndefined(structured))),
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
    const refused = yield* callTool({
      name: "find_similar_messages",
      args: { serverId: GUILD_A, query: "まだ聞いていない質問" },
    });
    expect(refused.isError).toBe(true);
    yield* writeMessages([{ id: LATE, channelId: A_OPEN, content: "ラーメンの新店" }]);
    yield* drainAlarms;
    expect(embeddedTexts).toStrictEqual([]);
  }),
);
