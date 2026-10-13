import { runDurableObjectAlarm } from "cloudflare:test";
import { Array, DateTime, Effect, Option, Schema, pipe } from "effect";

import { guildStore, indexTokens } from "#/entities/guild-message/index.server";
import type { IndexedMessage } from "#/entities/guild-message/index.server";
import { DIMENSIONS } from "#/shared/ai";
import { sealMessage } from "#/shared/crypto/index.server";

import { GUILD_A, guildKeys } from "./scenario";

const RAMEN_AXIS = 0;
const CAT_AXIS = 1;
const OTHER_AXIS = 2;
const SHARED_AXIS = 3;
const SHARED_WEIGHT = 0.1;
const FULL_WEIGHT = 1;
const NO_WEIGHT = 0;
const MINUTE_MS = 60_000;
const MAX_ALARMS = 30;

type SimilarSeed = Readonly<{ id: string; channelId: string; content: string }>;

const embeddedTexts: string[] = [];

const axisOf = (text: string): number => {
  if (text.includes("ラーメン") || text.includes("麺")) {
    return RAMEN_AXIS;
  }
  if (text.includes("猫")) {
    return CAT_AXIS;
  }
  return OTHER_AXIS;
};

const fakeEmbedding = (text: string): readonly number[] =>
  Array.makeBy(DIMENSIONS, (axis) => {
    if (axis === axisOf(text)) {
      return FULL_WEIGHT;
    }
    if (axis === SHARED_AXIS) {
      return SHARED_WEIGHT;
    }
    return NO_WEIGHT;
  });

const decodeTexts = Schema.decodeUnknownEffect(
  Schema.Struct({ text: Schema.Array(Schema.String) }),
);

const answerEmbedding = (inputs: unknown): Promise<Record<string, unknown>> =>
  Effect.runPromise(
    decodeTexts(inputs).pipe(
      Effect.tap(({ text }) =>
        Effect.sync(() => {
          embeddedTexts.push(...text);
        }),
      ),
      Effect.map(({ text }) => ({
        shape: [text.length, DIMENSIONS],
        data: text.map((piece) => fakeEmbedding(piece)),
      })),
    ),
  );

const indexedOf = ({ id, channelId, content }: SimilarSeed): Effect.Effect<IndexedMessage> =>
  Effect.gen(function* seed() {
    const keys = yield* guildKeys(GUILD_A);
    const now = DateTime.toEpochMillis(yield* DateTime.now);
    const body = { authorName: "someone", content, attachments: [], embeds: [], stickers: [] };
    return {
      row: {
        id,
        channelId,
        authorId: "501",
        sealed: yield* sealMessage(body, keys.key, { guildId: GUILD_A, channelId, messageId: id }),
        createdAt: now - MINUTE_MS,
        editedAt: Option.getOrNull(Option.none<number>()),
        describedWith: Option.getOrNull(Option.none<string>()),
      },
      tokens: yield* indexTokens({ key: keys.searchKey, texts: [content] }),
      phrases: { status: "pending" },
    };
  });

const writeMessages = (
  seeds: readonly Readonly<{ id: string; channelId: string; content: string }>[],
): Effect.Effect<void> =>
  pipe(
    seeds,
    Effect.forEach((seed) => indexedOf(seed)),
    Effect.flatMap((messages) =>
      Effect.promise(() => guildStore(GUILD_A).write(messages, "overwrite")),
    ),
  );

const drainAlarms = Effect.promise(() => runDurableObjectAlarm(guildStore(GUILD_A))).pipe(
  Effect.repeat({ while: (ran) => ran, times: MAX_ALARMS }),
  Effect.asVoid,
);

export { answerEmbedding, drainAlarms, embeddedTexts, writeMessages };
