import { eq } from "drizzle-orm";
import { Array, Effect, Option } from "effect";

import { db } from "./client.server.ts";
import { guild } from "./guild.table.ts";

export const wrappedKeyOf = (guildId: string): Effect.Effect<Option.Option<string>> =>
  Effect.promise(() =>
    db.select({ wrappedKey: guild.wrappedKey }).from(guild).where(eq(guild.id, guildId)),
  ).pipe(Effect.map((rows) => Option.map(Array.head(rows), ({ wrappedKey }) => wrappedKey)));
