import { DateTime, Effect } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import { db, erasedAuthor, listGuildIds } from "#/shared/db/index.server";

type EraseResult = Readonly<{ status: "erased" }>;

const ERASED: EraseResult = { status: "erased" };

const eraseOwnMessages = (authorId: string): Effect.Effect<EraseResult> =>
  DateTime.now.pipe(
    Effect.flatMap((now) =>
      Effect.promise(() =>
        db
          .insert(erasedAuthor)
          .values({ id: authorId, erasedAt: DateTime.toDate(now) })
          .onConflictDoNothing(),
      ),
    ),
    Effect.andThen(listGuildIds),
    Effect.flatMap((guildIds) =>
      Effect.forEach(
        guildIds,
        (guildId) => Effect.promise(() => guildStore(guildId).removeAuthor(authorId)),
        { discard: true },
      ),
    ),
    Effect.as(ERASED),
  );

export { eraseOwnMessages };
export type { EraseResult };
