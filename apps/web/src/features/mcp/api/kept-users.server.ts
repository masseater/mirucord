import { Effect } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";

export const keptUserIdsOf =
  (guildId: string) =>
  (userIds: readonly string[]): Effect.Effect<readonly string[]> =>
    Effect.promise(() => guildStore(guildId).keptUserIds(userIds));
