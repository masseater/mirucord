import { eq } from "drizzle-orm";
import { Array, Effect, pipe, Record } from "effect";

import { db } from "./client.server.ts";
import { role } from "./guild.table.ts";

export const loadRoleField = ({
  guildId,
  pick,
}: Readonly<{
  guildId: string;
  pick: (row: Readonly<{ name: string; permissions: string }>) => string;
}>): Effect.Effect<Readonly<Record<string, string>>> =>
  Effect.promise(() =>
    db
      .select({ id: role.id, name: role.name, permissions: role.permissions })
      .from(role)
      .where(eq(role.guildId, guildId)),
  ).pipe(
    Effect.map((rows) =>
      Record.fromEntries(
        pipe(
          rows,
          Array.map((row) => [row.id, pick(row)]),
        ),
      ),
    ),
  );
