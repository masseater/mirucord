import { Array, Effect, Number, Option, String } from "effect";

import type { MessageBody } from "#/shared/crypto/index.server";

import { hmacToken } from "./hmac.server";

const SHORTEST_GRAM = 1;
const LONGEST_GRAM = 3;
const NEXT = 1;
const NONE = 0;
const charsOf = (text: string): readonly string[] => Array.fromIterable(text.toLowerCase());

const gramsOfSize = (chars: readonly string[], size: number): readonly string[] =>
  Array.makeBy(Number.max(chars.length - size + NEXT, NONE), (start) =>
    chars.slice(start, start + size).join(""),
  );

const tokensOf = (key: CryptoKey, grams: readonly string[]): Effect.Effect<readonly string[]> =>
  Effect.forEach(Array.dedupe(grams), (gram) => hmacToken({ key, text: gram }), {
    concurrency: "unbounded",
  });

const GRAM_SIZES = Array.range(SHORTEST_GRAM, LONGEST_GRAM);

const indexTokens = ({
  key,
  texts,
}: Readonly<{ key: CryptoKey; texts: readonly string[] }>): Effect.Effect<readonly string[]> =>
  tokensOf(
    key,
    texts.flatMap((text) => {
      const chars = charsOf(text);
      return GRAM_SIZES.flatMap((size) => gramsOfSize(chars, size));
    }),
  );

const queryTokens = ({
  key,
  query,
}: Readonly<{ key: CryptoKey; query: string }>): Effect.Effect<readonly string[]> => {
  const chars = charsOf(query);
  return tokensOf(key, gramsOfSize(chars, Number.min(chars.length, LONGEST_GRAM)));
};

const embedTexts = (embeds: MessageBody["embeds"]): readonly string[] =>
  embeds.flatMap(({ title, description, fields }) => [
    ...Option.toArray(Option.fromUndefinedOr(title)),
    ...Option.toArray(Option.fromUndefinedOr(description)),
    ...fields.flatMap(({ name, value }) => [name, value]),
  ]);

const pollTexts = (poll: MessageBody["poll"]): readonly string[] =>
  Option.fromUndefinedOr(poll).pipe(
    Option.match({ onNone: () => [], onSome: ({ question, answers }) => [question, ...answers] }),
  );

const searchableTexts = ({
  content,
  attachments,
  embeds,
  stickers,
  poll,
}: Pick<
  MessageBody,
  "content" | "attachments" | "embeds" | "stickers" | "poll"
>): readonly string[] =>
  [
    content,
    ...attachments.flatMap(({ description }) =>
      Option.toArray(Option.fromUndefinedOr(description)),
    ),
    ...embedTexts(embeds),
    ...stickers,
    ...pollTexts(poll),
  ].filter((text) => String.isNonEmpty(text));

const containsQuery = ({
  texts,
  query,
}: Readonly<{ texts: readonly string[]; query: string }>): boolean => {
  const needle = query.toLowerCase();
  return texts.some((text) => text.toLowerCase().includes(needle));
};

export { containsQuery, indexTokens, queryTokens, searchableTexts };
