import { eq } from "drizzle-orm";
import { Array, Effect, pipe, Record } from "effect";

import { db } from "./client.server";
import { role } from "./guild.table";

export const loadRoles = (
  guildId: string,
): Effect.Effect<readonly Readonly<{ id: string; name: string; permissions: string }>[]> =>
  Effect.promise(() =>
    db
      .select({ id: role.id, name: role.name, permissions: role.permissions })
      .from(role)
      .where(eq(role.guildId, guildId)),
  );

export const loadRolePermissions = (
  guildId: string,
): Effect.Effect<Readonly<Record<string, string>>> =>
  loadRoles(guildId).pipe(
    Effect.map((rows) =>
      Record.fromEntries(
        pipe(
          rows,
          Array.map(({ id, permissions }) => [id, permissions]),
        ),
      ),
    ),
  );
