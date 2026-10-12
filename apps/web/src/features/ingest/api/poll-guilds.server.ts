import { eq } from "drizzle-orm";
import { Array, Boolean, DateTime, Effect, Option, pipe } from "effect";

import { isPollDue } from "#/features/ingest/model/sync-schedule";
import { isRotating, rewrapGuildKey } from "#/shared/crypto/index.server";
import { db, guild } from "#/shared/db/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";

import { refreshIngest } from "./consent-scope.server";
import { whenIngestEnabled } from "./ingest-flag.server";
import { syncMembership } from "./sync-guilds.server";

const rewrapGuildKeys: Effect.Effect<void> = Effect.promise(() =>
  db.select({ id: guild.id, wrappedKey: guild.wrappedKey }).from(guild),
).pipe(
  Effect.flatMap((rows) =>
    pipe(
      rows,
      Effect.forEach(({ id, wrappedKey }) =>
        rewrapGuildKey(wrappedKey).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.succeedNone,
              onSome: (rewrapped) =>
                Effect.promise(() =>
                  db.update(guild).set({ wrappedKey: rewrapped }).where(eq(guild.id, id)),
                ).pipe(Effect.as(Option.some(id))),
            }),
          ),
        ),
      ),
    ),
  ),
  Effect.flatMap((results) =>
    Effect.logInfo("Rewrapped guild keys").pipe(
      Effect.annotateLogs({ rewrapped: Array.getSomes(results).length }),
    ),
  ),
);

const pollGuilds: Effect.Effect<void, DiscordRequestError> = whenIngestEnabled(
  Effect.gen(function* pollGuilds() {
    const rotating = yield* isRotating;
    if (rotating) {
      yield* rewrapGuildKeys;
    }
    const now = yield* DateTime.now;
    yield* syncMembership((guildId) =>
      Boolean.match(isPollDue({ guildId, now }), {
        onTrue: () => refreshIngest(guildId),
        onFalse: () => Effect.void,
      }),
    );
  }),
);

export { pollGuilds };
