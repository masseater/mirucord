import { Array, Effect, pipe } from "effect";

import {
  containsQuery,
  openStored,
  queryTokens,
  searchableTexts,
  searchMessages,
} from "#/entities/guild-message/index.server";
import type { MessageView } from "#/entities/guild-message/index.server";
import type { GuildScope } from "#/entities/scope/index.server";
import { openSearchKey } from "#/shared/crypto/index.server";

export type FindRequest = Readonly<{
  scope: GuildScope;
  query: string;
  channelIds: readonly string[];
  limit: number;
  offset: number;
}>;

export type FoundMessages = Readonly<{ total: number; messages: readonly MessageView[] }>;

const NOTHING_FOUND: FoundMessages = { total: 0, messages: [] };

export const findMessages = (request: FindRequest): Effect.Effect<FoundMessages> => {
  const { guildId, wrappedKey, consent } = request.scope.guild;
  if (consent !== "consented") {
    return Effect.succeed(NOTHING_FOUND);
  }
  return openSearchKey(wrappedKey).pipe(
    Effect.flatMap((key) => queryTokens({ key, query: request.query })),
    Effect.flatMap((tokens) =>
      searchMessages({
        guildId,
        tokens,
        channelIds: request.channelIds,
        offset: request.offset,
        limit: request.limit,
      }),
    ),
    Effect.flatMap(({ total, entries }) =>
      openStored({ scope: request.scope, stored: entries }).pipe(
        Effect.map((views) => ({
          total,
          messages: pipe(
            views,
            Array.filter((view) =>
              containsQuery({ texts: searchableTexts(view), query: request.query }),
            ),
          ),
        })),
      ),
    ),
  );
};
