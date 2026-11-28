import { Array, Effect, pipe } from "effect";

import { db } from "./client.server.ts";
import { guild } from "./guild.table.ts";

export const listGuildIds: Effect.Effect<readonly string[]> = Effect.promise(() =>
  db.select({ id: guild.id }).from(guild),
).pipe(
  Effect.map((rows) =>
    pipe(
      rows,
      Array.map(({ id }) => id),
    ),
  ),
);
