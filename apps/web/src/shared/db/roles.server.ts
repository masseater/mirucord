import { eq } from "drizzle-orm";
import { Array, Effect, pipe, Record } from "effect";

import { db } from "./client.server";
import { role } from "./guild.table";

export const loadRoleField = ({
  guildId,
  field,
}: Readonly<{
  guildId: string;
  field: "name" | "permissions";
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
          Array.map((row) => [row.id, row[field]]),
        ),
      ),
    ),
  );
