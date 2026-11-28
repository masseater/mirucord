import { Array, DateTime, Effect, Option, pipe } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import { ingestOf, readableChannels } from "#/entities/scope/index.server";
import type { GuildScope } from "#/entities/scope/index.server";
import type { ChannelOutput } from "#/features/get-server/model/channels-output";

const oldestStored = (
  scope: GuildScope,
  channelIds: readonly string[],
): Effect.Effect<ReadonlyMap<string, string>> => {
  if (scope.guild.consent !== "consented") {
    return Effect.succeed(new Map());
  }
  return Effect.promise(() => guildStore(scope.guild.guildId).oldestByChannel(channelIds)).pipe(
    Effect.map(
      (oldest) =>
        new Map(
          pipe(
            oldest,
            Array.map(
              ({ channelId, oldest: createdAt }) =>
                [channelId, DateTime.formatIso(DateTime.makeUnsafe(createdAt))] as const,
            ),
          ),
        ),
    ),
  );
};

export const visibleChannels = (
  scope: GuildScope,
): Effect.Effect<readonly (typeof ChannelOutput.Type)[]> => {
  const channels = readableChannels(scope);
  return oldestStored(
    scope,
    pipe(
      channels,
      Array.map(({ id }) => id),
    ),
  ).pipe(
    Effect.map((oldest) =>
      pipe(
        channels,
        Array.map((stored) => ({
          id: stored.id,
          name: stored.name,
          type: stored.type,
          parentId: Option.getOrNull(stored.parentId),
          ingest: ingestOf({ scope, stored }),
          oldestStoredAt: Option.getOrNull(Option.fromUndefinedOr(oldest.get(stored.id))),
        })),
      ),
    ),
  );
};
