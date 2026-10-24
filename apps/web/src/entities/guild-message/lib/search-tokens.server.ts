import { Array, Effect, Number, Option, pipe, String } from "effect";

import { openMessage } from "#/shared/crypto/index.server";
import type { MessageAddress, MessageBody } from "#/shared/crypto/index.server";

import { hmacWord } from "./hmac.server";

const SHORTEST_GRAM = 1;
const LONGEST_GRAM = 3;
const NEXT = 1;
const NONE = 0;
const charsOf = (text: string): readonly string[] => Array.fromIterable(text.toLowerCase());

const gramsOfSize = (chars: readonly string[], size: number): readonly string[] =>
  Array.makeBy(Number.max(chars.length - size + NEXT, NONE), (start) =>
    pipe(chars.slice(start, start + size), Array.join("")),
  );

const tokensOf = (key: CryptoKey, grams: readonly string[]): Effect.Effect<readonly number[]> =>
  Effect.forEach(Array.dedupe(grams), (gram) => hmacWord({ key, text: gram }), {
    concurrency: "unbounded",
  });

const GRAM_SIZES = Array.range(SHORTEST_GRAM, LONGEST_GRAM);

const indexTokens = ({
  key,
  texts,
}: Readonly<{ key: CryptoKey; texts: readonly string[] }>): Effect.Effect<readonly number[]> =>
  tokensOf(
    key,
    pipe(
      texts,
      Array.flatMap((text) => {
        const chars = charsOf(text);
        return pipe(
          GRAM_SIZES,
          Array.flatMap((size) => gramsOfSize(chars, size)),
        );
      }),
    ),
  );

const queryTokens = ({
  key,
  query,
}: Readonly<{ key: CryptoKey; query: string }>): Effect.Effect<readonly number[]> => {
  const chars = charsOf(query);
  return tokensOf(key, gramsOfSize(chars, Number.min(chars.length, LONGEST_GRAM)));
};

const embedTexts = (embeds: MessageBody["embeds"]): readonly string[] =>
  pipe(
    embeds,
    Array.flatMap(({ title, description, fields }) => [
      ...Option.toArray(Option.fromUndefinedOr(title)),
      ...Option.toArray(Option.fromUndefinedOr(description)),
      ...pipe(
        fields,
        Array.flatMap(({ name, value }) => [name, value]),
      ),
    ]),
  );

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
  pipe(
    [
      content,
      ...pipe(
        attachments,
        Array.flatMap(({ description }) => Option.toArray(Option.fromUndefinedOr(description))),
      ),
      ...embedTexts(embeds),
      ...stickers,
      ...pollTexts(poll),
    ],
    Array.filter((text) => String.isNonEmpty(text)),
  );

const containsQuery = ({
  texts,
  query,
}: Readonly<{ texts: readonly string[]; query: string }>): boolean => {
  const needle = query.toLowerCase();
  return pipe(
    texts,
    Array.some((text) => text.toLowerCase().includes(needle)),
  );
};

type SealedText = Readonly<{
  sealed: string;
  keys: Readonly<{ key: CryptoKey; searchKey: CryptoKey }>;
  address: MessageAddress;
}>;

const sealedTokens = ({ sealed, keys, address }: SealedText): Effect.Effect<readonly number[]> =>
  openMessage(sealed, keys.key, address).pipe(
    Effect.flatMap((body) => indexTokens({ key: keys.searchKey, texts: searchableTexts(body) })),
  );

export { containsQuery, indexTokens, queryTokens, sealedTokens, searchableTexts };
export type { SealedText };
