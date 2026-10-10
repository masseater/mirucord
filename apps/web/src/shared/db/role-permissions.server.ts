import { eq } from "drizzle-orm";
import { Effect, Record } from "effect";

import { db } from "./client.server";
import { role } from "./guild.table";

const loadRolePermissions = (guildId: string): Effect.Effect<Readonly<Record<string, string>>> =>
  Effect.promise(() =>
    db
      .select({ id: role.id, permissions: role.permissions })
      .from(role)
      .where(eq(role.guildId, guildId)),
  ).pipe(
    Effect.map((rows) => Record.fromEntries(rows.map(({ id, permissions }) => [id, permissions]))),
  );

export { loadRolePermissions };
