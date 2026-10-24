import { Array, DateTime, Effect, Option, pipe } from "effect";

import type { DiscordMessage } from "#/shared/discord/index.server";

import { idsOf, isFullPage } from "./message-page.server";
import { channelMessagesSince, deleteMessages } from "./message-rows.server";
import type { ChannelRef } from "./message-rows.server";

const oldestTimestamp = (page: readonly DiscordMessage[]): Option.Option<DateTime.DateTime> =>
  Array.match(page, {
    onEmpty: () => Option.none(),
    onNonEmpty: (nonEmpty) => {
      const timestamps = pipe(
        nonEmpty,
        Array.map(({ timestamp }) => timestamp),
      );
      return Option.some(Array.min(timestamps, DateTime.Order));
    },
  });

const removeDeleted = ({
  ref,
  latest,
}: Readonly<{
  ref: ChannelRef;
  latest: readonly DiscordMessage[];
}>): Effect.Effect<void> => {
  const since = Option.some(latest).pipe(
    Option.filter(isFullPage),
    Option.flatMap(oldestTimestamp),
  );
  const present = new Set(idsOf(latest));
  return channelMessagesSince({ ...ref, since }).pipe(
    Effect.map((stored) =>
      pipe(
        stored,
        Array.filter((id) => !present.has(id)),
      ),
    ),
    Effect.flatMap((gone) => deleteMessages({ guildId: ref.guildId, ids: gone })),
  );
};

export { removeDeleted };
