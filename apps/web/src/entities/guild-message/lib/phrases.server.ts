import { Array, Effect, Option, String } from "effect";

import type { MessageBody } from "#/shared/crypto/index.server";

import { hmacToken } from "./hmac.server";

const LONGEST_PHRASE = 15;
const PHRASE_WINDOW_DAYS = 30;
const CUSTOM_EMOJI = /<a?:(?<name>\w+):(?<id>\d+)>/gu;
const NOT_PLAIN_TEXT = /<a?:\w+:\d+>|<[@#]|https?:\/\//u;
const WHITESPACE = /\s+/gu;
const WORDLIKE = /[\p{L}\p{Extended_Pictographic}]/u;

type PhraseKind = "text" | "emoji" | "sticker";

type Phrase = Readonly<{ kind: PhraseKind; key: string; label: string }>;

type PhraseHash = Readonly<{ phrase: string; common: string }>;

type PhraseSource = Pick<MessageBody, "content" | "stickers">;

type HashRequest = Readonly<{
  searchKey: CryptoKey;
  commonKey: CryptoKey;
  source: PhraseSource;
}>;

type LabelRequest = Readonly<{ searchKey: CryptoKey; source: PhraseSource; phrase: string }>;

const normalize = (text: string): string =>
  text.normalize("NFKC").toLowerCase().trim().replaceAll(WHITESPACE, " ");

const isShort = (text: string): boolean => Array.fromIterable(text).length <= LONGEST_PHRASE;

const isPlainText = (text: string): boolean => !NOT_PLAIN_TEXT.test(text);

const isWordlike = ({ kind, label }: Phrase): boolean => kind !== "text" || WORDLIKE.test(label);

const textPhrase = (content: string): Option.Option<Phrase> =>
  Option.some(normalize(content)).pipe(
    Option.filter(String.isNonEmpty),
    Option.filter(isShort),
    Option.filter(isPlainText),
    Option.map((text): Phrase => ({ kind: "text", key: `text:${text}`, label: text })),
    Option.filter(isWordlike),
  );

const emojiPhrases = (content: string): readonly Phrase[] =>
  Array.fromIterable(content.matchAll(CUSTOM_EMOJI)).flatMap(({ groups }) =>
    Option.toArray(Option.fromUndefinedOr(groups)).map(({ name, id }) => ({
      kind: "emoji",
      key: `emoji:${id}`,
      label: `:${name}:`,
    })),
  );

const stickerPhrases = (stickers: readonly string[]): readonly Phrase[] =>
  stickers.map((name) => ({ kind: "sticker", key: `sticker:${name}`, label: name }));

const phrasesOf = ({ content, stickers }: PhraseSource): readonly Phrase[] =>
  Array.dedupeWith(
    [...Option.toArray(textPhrase(content)), ...emojiPhrases(content), ...stickerPhrases(stickers)],
    (left, right) => left.key === right.key,
  );

const phraseHashes = ({
  searchKey,
  commonKey,
  source,
}: HashRequest): Effect.Effect<readonly PhraseHash[]> =>
  Effect.forEach(phrasesOf(source), ({ key }) =>
    Effect.all({
      phrase: hmacToken({ key: searchKey, text: key }),
      common: hmacToken({ key: commonKey, text: key }),
    }),
  );

const labelOf = ({
  searchKey,
  source,
  phrase,
}: LabelRequest): Effect.Effect<Option.Option<Phrase>> =>
  Effect.findFirst(phrasesOf(source), (candidate) =>
    hmacToken({ key: searchKey, text: candidate.key }).pipe(
      Effect.map((token) => token === phrase),
    ),
  );

export { labelOf, PHRASE_WINDOW_DAYS, phraseHashes };
export type { HashRequest, LabelRequest, Phrase, PhraseHash, PhraseKind, PhraseSource };
