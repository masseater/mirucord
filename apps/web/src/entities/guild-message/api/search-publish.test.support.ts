import { Array, Effect, Option, pipe } from "effect";

import type { IndexedMessage } from "#/entities/guild-message/index.server";

import { searchMessages } from "./search-messages.server";

export const CHANNEL = "600";
const AUTHOR = "701";
export const FIRST_AT = 1_790_000_000_000;
export const WORD = 7;
export const BATCH = 500;
const FIRST_PAGE = 0;
export const PAGE = 5;
export const FIRST = 1;

export type Seed = Readonly<{ index: number; tokens: readonly number[]; channelId?: string }>;

export const messageAt = ({ index, tokens, channelId = CHANNEL }: Seed): IndexedMessage => ({
  row: {
    id: `${FIRST_AT + index}`,
    channelId,
    authorId: AUTHOR,
    sealed: `sealed-${index}`,
    createdAt: FIRST_AT + index,
    editedAt: Option.getOrNull(Option.none<number>()),
    describedWith: Option.getOrNull(Option.none<string>()),
  },
  tokens,
  phrases: { status: "pending" },
});

export type Found = Readonly<{ total: number; ids: readonly string[] }>;

export type Query = Readonly<{
  guildId: string;
  tokens: readonly number[];
  offset?: number;
  limit?: number;
  channelIds?: readonly string[];
}>;

export const find = ({
  guildId,
  tokens,
  offset = FIRST_PAGE,
  limit = PAGE,
  channelIds = [CHANNEL],
}: Query): Effect.Effect<Found> =>
  searchMessages({ guildId, tokens, channelIds, offset, limit }).pipe(
    Effect.map(({ total, entries }) => ({
      total,
      ids: pipe(
        entries,
        Array.map(({ id }) => id),
      ),
    })),
  );

export const totalOf = (query: Query): Effect.Effect<number> =>
  find(query).pipe(Effect.map(({ total }) => total));

export const idOf = (index: number): string => `${FIRST_AT + index}`;
