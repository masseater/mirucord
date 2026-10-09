import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { channel, guild } from "#/shared/db";

const supportGrant = sqliteTable(
  "support_grant",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    guildId: text()
      .notNull()
      .references(() => guild.id, { onDelete: "cascade" }),
    grantedBy: text().notNull(),
    createdAt: integer({ mode: "timestamp_ms" }).notNull(),
    expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
    revokedAt: integer({ mode: "timestamp_ms" }),
  },
  (table) => [index("support_grant_guild_id_idx").on(table.guildId, table.expiresAt)],
);

const supportAccess = sqliteTable(
  "support_access",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    guildId: text()
      .notNull()
      .references(() => guild.id, { onDelete: "cascade" }),
    operatorId: text().notNull(),
    tool: text().notNull(),
    channelId: text().references(() => channel.id, { onDelete: "set null" }),
    accessedAt: integer({ mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("support_access_guild_id_idx").on(table.guildId, table.accessedAt)],
);

export { supportAccess, supportGrant };
