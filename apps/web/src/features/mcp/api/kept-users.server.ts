import { Array, Effect, Option } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import { liveInterestedOf, liveThreadMembersOf } from "#/shared/discord/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";

type LiveUserIds = Effect.Effect<readonly string[] | null, DiscordRequestError>;

const NO_LIVE = Option.getOrNull(Option.none<readonly string[]>());

const keptUserIdsOf =
  (guildId: string) =>
  (userIds: readonly string[]): Effect.Effect<readonly string[]> =>
    Effect.promise(() => guildStore(guildId).keptUserIds(userIds));

const keptLiveOf = (guildId: string) => {
  const kept = Option.match({
    onNone: (): Effect.Effect<readonly string[] | null> => Effect.succeed(NO_LIVE),
    onSome: keptUserIdsOf(guildId),
  });
  return (
    live: Effect.Effect<Option.Option<readonly string[]>, DiscordRequestError>,
  ): LiveUserIds => live.pipe(Effect.flatMap(kept));
};

const liveInterestedKeptOf =
  (guildId: string) =>
  (events: readonly Readonly<{ eventId: string }>[]): LiveUserIds =>
    Option.match(Array.head(events), {
      onNone: () => Effect.succeed(NO_LIVE),
      onSome: ({ eventId }) => keptLiveOf(guildId)(liveInterestedOf({ guildId, eventId })),
    });

const liveThreadMembersKeptOf =
  (guildId: string) =>
  (threadId: Option.Option<string>): LiveUserIds =>
    Option.match(threadId, {
      onNone: () => Effect.succeed(NO_LIVE),
      onSome: (id) => keptLiveOf(guildId)(liveThreadMembersOf(id)),
    });

export { keptUserIdsOf, liveInterestedKeptOf, liveThreadMembersKeptOf };
export type { DiscordRequestError } from "#/shared/discord/index.server";
export type { LiveUserIds };
