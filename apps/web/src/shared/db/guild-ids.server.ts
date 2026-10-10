import { Effect } from "effect";

import { db } from "./client.server";
import { guild } from "./guild.table";

const listGuildIds: Effect.Effect<readonly string[]> = Effect.promise(() =>
  db.select({ id: guild.id }).from(guild),
).pipe(Effect.map((rows) => rows.map(({ id }) => id)));

export { listGuildIds };
