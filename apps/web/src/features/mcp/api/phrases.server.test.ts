import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { runDurableObjectAlarm } from "cloudflare:test";
import { Array, DateTime, Effect, Option, pipe } from "effect";
import { afterAll, beforeAll, beforeEach, expect } from "vite-plus/test";

import { guildStore, indexTokens, phraseHashes } from "#/entities/guild-message/index.server";
import type { IndexedMessage, PhraseState } from "#/entities/guild-message/index.server";
import { sealMessage } from "#/shared/crypto/index.server";

import { listPhrases, mockPhraseModel, prompts } from "./__tests__/phrase-model";
import {
  A_OPEN,
  A_STAFF,
  discordMembers,
  GUILD_A,
  guildKeys,
  seedScenario,
} from "./__tests__/scenario";

const ERASED_AUTHOR = "501";
const PEOPLE = [ERASED_AUTHOR, "502", "503", ERASED_AUTHOR, "502"];
const OPEN_PHRASE = "ぷり";
const STAFF_PHRASE = "ひみつ";
const COMMON_PHRASE = "うん";
const NOTE_SUFFIX = "を挨拶のように使う";
const ONCE = 1;
const EMOJI = "<:aza_2:1234>";
const MINUTE_MS = 60_000;

type Seed = Readonly<{
  prefix: string;
  channelId: string;
  content: string;
  phrases: (
    hashes: Extract<PhraseState, Readonly<{ status: "extracted" }>>["hashes"],
  ) => PhraseState;
}>;

const extracted: Seed["phrases"] = (hashes) => ({ status: "extracted", hashes });
const pending: Seed["phrases"] = () => ({ status: "pending" });

const seedMessages = ({ prefix, channelId, content, phrases }: Seed): Effect.Effect<void> =>
  Effect.gen(function* seed() {
    const keys = yield* guildKeys(GUILD_A);
    const now = DateTime.toEpochMillis(yield* DateTime.now);
    const body = { authorName: "someone", content, attachments: [], embeds: [], stickers: [] };
    const hashes = yield* phraseHashes({ ...keys, source: body });
    const messages = yield* pipe(
      PEOPLE,
      Effect.forEach((authorId, index): Effect.Effect<IndexedMessage> =>
        Effect.all({
          sealed: sealMessage(body, keys.key, {
            guildId: GUILD_A,
            channelId,
            messageId: `${prefix}${index}`,
          }),
          tokens: indexTokens({ key: keys.searchKey, texts: [content] }),
        }).pipe(
          Effect.map(({ sealed, tokens }) => ({
            row: {
              id: `${prefix}${index}`,
              channelId,
              authorId,
              sealed,
              createdAt: now - MINUTE_MS * (PEOPLE.length - index),
              editedAt: Option.getOrNull(Option.none<number>()),
              describedWith: Option.getOrNull(Option.none<string>()),
            },
            tokens,
            phrases: phrases(hashes),
          })),
        ),
      ),
    );
    yield* Effect.promise(() => guildStore(GUILD_A).write(messages, "overwrite"));
  });

const SEEDS: readonly Seed[] = [
  { prefix: "71", channelId: A_OPEN, content: OPEN_PHRASE, phrases: extracted },
  { prefix: "72", channelId: A_STAFF, content: STAFF_PHRASE, phrases: extracted },
  { prefix: "73", channelId: A_OPEN, content: EMOJI, phrases: pending },
  { prefix: "74", channelId: A_OPEN, content: COMMON_PHRASE, phrases: extracted },
];

const publishAll = Effect.promise(() => guildStore(GUILD_A).publish());

const network = setupNetwork();

beforeAll(() => {
  network.enable();
  network.use(discordMembers);
  const seedAll = pipe(
    SEEDS,
    Effect.forEach((seed) => seedMessages(seed)),
  );
  return Effect.runPromise(
    Effect.promise(seedScenario).pipe(Effect.andThen(seedAll), Effect.andThen(publishAll)),
  );
});

beforeEach(() => {
  mockPhraseModel({ common: COMMON_PHRASE, note: `${OPEN_PHRASE}${NOTE_SUFFIX}` });
});

afterAll(() => {
  network.disable();
});

it.effect("lists what several members repeat in channels the user can read", () =>
  Effect.gen(function* repeated() {
    const phrases = yield* listPhrases;
    expect(
      pipe(
        phrases,
        Array.map(({ kind, phrase, uses, people }) => ({ kind, phrase, uses, people })),
      ),
    ).toContainEqual({ kind: "text", phrase: OPEN_PHRASE, uses: PEOPLE.length, people: 3 });
    expect(
      pipe(
        phrases,
        Array.map(({ phrase }) => phrase),
      ),
    ).not.toContain(STAFF_PHRASE);
    expect(
      pipe(
        phrases,
        Array.map(({ phrase }) => phrase),
      ),
    ).not.toContain(COMMON_PHRASE);
    expect(
      pipe(
        phrases,
        Array.filter(({ phrase }) => phrase === OPEN_PHRASE),
        Array.map(({ note }) => note),
      ),
    ).toStrictEqual([`${OPEN_PHRASE}${NOTE_SUFFIX}`]);
    expect(
      pipe(
        phrases,
        Array.filter(({ phrase }) => phrase === OPEN_PHRASE),
        Array.flatMap(({ examples }) =>
          pipe(
            examples,
            Array.flatMap((example) => Option.toArray(Array.last(example))),
          ),
        ),
      ),
    ).toStrictEqual([OPEN_PHRASE, OPEN_PHRASE]);
  }),
);

it.effect("writes each note once and reuses it on the next call", () =>
  Effect.gen(function* reused() {
    yield* listPhrases;
    yield* listPhrases;
    expect(
      pipe(
        prompts,
        Array.filter((prompt) => prompt.includes(`「${OPEN_PHRASE}」`)),
      ),
    ).toHaveLength(ONCE);
  }),
);

it.effect("counts messages stored before phrases were extracted once they are backfilled", () =>
  Effect.gen(function* backfilled() {
    yield* listPhrases;
    yield* Effect.promise(() => runDurableObjectAlarm(guildStore(GUILD_A)));
    const phrases = yield* listPhrases;
    expect(
      pipe(
        phrases,
        Array.map(({ kind, phrase }) => ({ kind, phrase })),
      ),
    ).toContainEqual({
      kind: "emoji",
      phrase: ":aza_2:",
    });
  }),
);

it.effect("drops a phrase once an erased author's uses no longer reach the threshold", () =>
  Effect.gen(function* erased() {
    yield* listPhrases;
    yield* Effect.promise(() => guildStore(GUILD_A).eraseAuthor(ERASED_AUTHOR));
    const phrases = yield* listPhrases;
    expect(
      pipe(
        phrases,
        Array.map(({ phrase }) => phrase),
      ),
    ).toStrictEqual([]);
  }),
);
