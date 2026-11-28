import { Array, Effect, Option, pipe, String } from "effect";

import type { MessageBody } from "#/shared/crypto/index.server";

import { hmac, tokenOf } from "./hmac.server.ts";

const LONGEST_PHRASE = 15;
export const PHRASE_WINDOW_DAYS = 30;
const CUSTOM_EMOJI = /<a?:(?<name>\w+):(?<id>\d+)>/gu;
const NOT_PLAIN_TEXT = /<a?:\w+:\d+>|<[@#]|https?:\/\//u;
const WHITESPACE = /\s+/gu;
const WORDLIKE = /[\p{L}\p{Extended_Pictographic}]/u;

export type PhraseKind = "text" | "emoji" | "sticker";

export type Phrase = Readonly<{ kind: PhraseKind; key: string; label: string }>;

export type PhraseHash = Readonly<{ phrase: string; common: string }>;

export type PhraseSource = Pick<MessageBody, "content" | "stickers">;

export type HashRequest = Readonly<{
  searchKey: CryptoKey;
  commonKey: CryptoKey;
  source: PhraseSource;
}>;

export type LabelRequest = Readonly<{ searchKey: CryptoKey; source: PhraseSource; phrase: string }>;

const normalize = (text: string): string =>
  pipe(
    text,
    String.normalize("NFKC"),
    String.toLowerCase,
    String.trim,
    String.replaceAll(WHITESPACE, " "),
  );

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
  pipe(
    content,
    String.matchAll(CUSTOM_EMOJI),
    Array.fromIterable,
    Array.flatMap(({ groups }) =>
      pipe(
        Option.toArray(Option.fromUndefinedOr(groups)),
        Array.map(({ name, id }): Phrase => ({
          kind: "emoji",
          key: `emoji:${id}`,
          label: `:${name}:`,
        })),
      ),
    ),
  );

const stickerPhrases = (stickers: readonly string[]): readonly Phrase[] =>
  pipe(
    stickers,
    Array.map((name): Phrase => ({ kind: "sticker", key: `sticker:${name}`, label: name })),
  );

const phrasesOf = ({ content, stickers }: PhraseSource): readonly Phrase[] =>
  Array.dedupeWith(
    [...Option.toArray(textPhrase(content)), ...emojiPhrases(content), ...stickerPhrases(stickers)],
    (left, right) => left.key === right.key,
  );

export const phraseHashes = ({
  searchKey,
  commonKey,
  source,
}: HashRequest): Effect.Effect<readonly PhraseHash[]> =>
  Effect.forEach(
    phrasesOf(source),
    ({ key }) =>
      Effect.all(
        {
          phrase: Effect.map(hmac({ key: searchKey, text: key }), tokenOf),
          common: Effect.map(hmac({ key: commonKey, text: key }), tokenOf),
        },
        { concurrency: 1 },
      ),
    { concurrency: 1 },
  );

export const labelOf = ({
  searchKey,
  source,
  phrase,
}: LabelRequest): Effect.Effect<Option.Option<Phrase>> =>
  Effect.findFirst(phrasesOf(source), (candidate) =>
    hmac({ key: searchKey, text: candidate.key }).pipe(
      Effect.map((signed) => tokenOf(signed) === phrase),
    ),
  );
