import { Array, Effect, Option } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import { liveInterestedOf } from "#/shared/discord/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";

const NO_LIVE = Option.getOrNull(Option.none<readonly string[]>());

const keptUserIdsOf =
  (guildId: string) =>
  (userIds: readonly string[]): Effect.Effect<readonly string[]> =>
    Effect.promise(() => guildStore(guildId).keptUserIds(userIds));

const liveInterestedKeptOf =
  (guildId: string) =>
  (
    events: readonly Readonly<{ eventId: string }>[],
  ): Effect.Effect<readonly string[] | null, DiscordRequestError> => {
    const kept = Option.match({
      onNone: (): Effect.Effect<readonly string[] | null> => Effect.succeed(NO_LIVE),
      onSome: keptUserIdsOf(guildId),
    });
    return Option.match(Array.head(events), {
      onNone: () => Effect.succeed(NO_LIVE),
      onSome: ({ eventId }) => liveInterestedOf({ guildId, eventId }).pipe(Effect.flatMap(kept)),
    });
  };

export { keptUserIdsOf, liveInterestedKeptOf };
export type { DiscordRequestError } from "#/shared/discord/index.server";
