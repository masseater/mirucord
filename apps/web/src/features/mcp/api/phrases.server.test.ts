import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { runDurableObjectAlarm } from "cloudflare:test";
import { Array, DateTime, Effect, Option, Schema, pipe } from "effect";
import { afterAll, beforeAll, expect } from "vite-plus/test";

import { guildStore, indexTokens, phraseHashes } from "#/entities/guild-message/index.server";
import type { IndexedMessage, PhraseState } from "#/entities/guild-message/index.server";
import { sealMessage } from "#/shared/crypto/index.server";

import {
  A_OPEN,
  A_STAFF,
  discordMembers,
  GUILD_A,
  guildKeys,
  seedScenario,
} from "./__tests__/scenario";
import { callTool } from "./__tests__/tool-call";
import { ListServerPhrasesOutput } from "./tool-output";

const ERASED_AUTHOR = "501";
const PEOPLE = [ERASED_AUTHOR, "502", "503", ERASED_AUTHOR, "502"];
const OPEN_PHRASE = "ぷり";
const STAFF_PHRASE = "ひみつ";
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

const decodePhrases = Schema.decodeUnknownEffect(ListServerPhrasesOutput);

const listPhrases = callTool({ name: "list_server_phrases", args: { serverId: GUILD_A } }).pipe(
  Effect.flatMap(({ structured }) => decodePhrases(Option.getOrUndefined(structured))),
  Effect.map(({ phrases }) => phrases),
  Effect.orDie,
);

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
];

const network = setupNetwork();

beforeAll(() => {
  network.enable();
  network.use(discordMembers);
  const seedAll = pipe(
    SEEDS,
    Effect.forEach((seed) => seedMessages(seed)),
  );
  return Effect.runPromise(Effect.promise(seedScenario).pipe(Effect.andThen(seedAll)));
});

afterAll(() => {
  network.disable();
});

it.effect("lists what several members repeat in channels the user can read", () =>
  Effect.gen(function* repeated() {
    const phrases = yield* listPhrases;
    expect(
      phrases.map(({ kind, phrase, uses, people }) => ({ kind, phrase, uses, people })),
    ).toContainEqual({ kind: "text", phrase: OPEN_PHRASE, uses: PEOPLE.length, people: 3 });
    expect(phrases.map(({ phrase }) => phrase)).not.toContain(STAFF_PHRASE);
    expect(
      phrases
        .filter(({ phrase }) => phrase === OPEN_PHRASE)
        .flatMap(({ examples }) =>
          examples.flatMap((example) => Option.toArray(Array.last(example))),
        ),
    ).toStrictEqual([OPEN_PHRASE, OPEN_PHRASE]);
  }),
);

it.effect("counts messages stored before phrases were extracted once they are backfilled", () =>
  Effect.gen(function* backfilled() {
    yield* listPhrases;
    yield* Effect.promise(() => runDurableObjectAlarm(guildStore(GUILD_A)));
    const phrases = yield* listPhrases;
    expect(phrases.map(({ kind, phrase }) => ({ kind, phrase }))).toContainEqual({
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
    expect(phrases.map(({ phrase }) => phrase)).toStrictEqual([]);
  }),
);
