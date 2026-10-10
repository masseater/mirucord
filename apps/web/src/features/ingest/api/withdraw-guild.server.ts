import { count, eq } from "drizzle-orm";
import { Array, Data, Effect, Option } from "effect";

import { channel, db, ingestConsent, message } from "#/shared/db/index.server";

import { purgeChannel } from "./consent-scope.server";
import type { VectorizeError } from "./vectors.server";

class GuildDataRemainsError extends Data.TaggedError("GuildDataRemainsError")<{
  readonly guildId: string;
  readonly remaining: number;
}> {}

const NOTHING_STORED = 0;

const storedCount = (guildId: string): Effect.Effect<number> =>
  Effect.promise(() =>
    db.select({ stored: count() }).from(message).where(eq(message.guildId, guildId)),
  ).pipe(
    Effect.map((rows) =>
      Option.match(Array.head(rows), {
        onNone: () => NOTHING_STORED,
        onSome: ({ stored }) => stored,
      }),
    ),
  );

const purgeGuild = (guildId: string): Effect.Effect<void, GuildDataRemainsError | VectorizeError> =>
  Effect.promise(() =>
    db.select({ id: channel.id }).from(channel).where(eq(channel.guildId, guildId)),
  ).pipe(
    Effect.flatMap((rows) => Effect.forEach(rows, ({ id }) => purgeChannel(id), { discard: true })),
    Effect.andThen(storedCount(guildId)),
    Effect.filterOrFail(
      (remaining) => remaining === NOTHING_STORED,
      (remaining) => new GuildDataRemainsError({ guildId, remaining }),
    ),
    Effect.asVoid,
  );

const withdrawGuild = (
  guildId: string,
): Effect.Effect<void, GuildDataRemainsError | VectorizeError> =>
  purgeGuild(guildId).pipe(
    Effect.andThen(
      Effect.promise(() => db.delete(ingestConsent).where(eq(ingestConsent.guildId, guildId))),
    ),
    Effect.andThen(purgeGuild(guildId)),
  );

export { GuildDataRemainsError, withdrawGuild };
export type { VectorizeError } from "./vectors.server";
