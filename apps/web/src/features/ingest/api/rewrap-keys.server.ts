import { eq } from "drizzle-orm";
import { Array, Effect, Option, pipe } from "effect";

import { isRotating, rewrapGuildKey } from "#/shared/crypto/index.server";
import { db, guild } from "#/shared/db/index.server";

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

const rewrapWhileRotating: Effect.Effect<void> = isRotating.pipe(
  Effect.flatMap((rotating) => {
    if (rotating) {
      return rewrapGuildKeys;
    }
    return Effect.void;
  }),
);

export { rewrapWhileRotating };
