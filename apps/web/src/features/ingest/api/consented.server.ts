import { and, eq } from "drizzle-orm";
import { Array, Effect, Option } from "effect";

import { db, guild, ingestConsent } from "#/shared/db/index.server";

const consentedKey = (guildId: string): Effect.Effect<Option.Option<string>> =>
  Effect.promise(() =>
    db
      .select({ wrappedKey: guild.wrappedKey })
      .from(guild)
      .innerJoin(ingestConsent, eq(ingestConsent.guildId, guild.id))
      .where(and(eq(guild.id, guildId), eq(ingestConsent.state, "granted"))),
  ).pipe(Effect.map((rows) => Array.head(rows).pipe(Option.map(({ wrappedKey }) => wrappedKey))));

const whenConsented =
  (guildId: string) =>
  <Failure>(
    use: (wrappedKey: string) => Effect.Effect<void, Failure>,
  ): Effect.Effect<void, Failure> =>
    consentedKey(guildId).pipe(
      Effect.flatMap(Option.match({ onNone: () => Effect.void, onSome: use })),
    );

export { whenConsented };
