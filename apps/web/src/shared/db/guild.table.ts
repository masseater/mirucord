import type { OverwriteType } from "discord-api-types/v10";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

type PermissionOverwrite = Readonly<{
  id: string;
  type: OverwriteType;
  allow: string;
  deny: string;
}>;

const guild = sqliteTable("guild", {
  id: text().primaryKey(),
  name: text().notNull(),
  ownerId: text().notNull(),
  wrappedKey: text().notNull(),
  joinedAt: integer({ mode: "timestamp_ms" }).notNull(),
});

const role = sqliteTable(
  "role",
  {
    id: text().primaryKey(),
    guildId: text()
      .notNull()
      .references(() => guild.id, { onDelete: "cascade" }),
    permissions: text().notNull(),
  },
  (table) => [index("role_guild_id_idx").on(table.guildId)],
);

const channel = sqliteTable(
  "channel",
  {
    id: text().primaryKey(),
    guildId: text()
      .notNull()
      .references(() => guild.id, { onDelete: "cascade" }),
    parentId: text(),
    name: text().notNull(),
    type: integer().notNull(),
    permissionOverwrites: text({ mode: "json" }).$type<readonly PermissionOverwrite[]>().notNull(),
    newestMessageId: text(),
    oldestMessageId: text(),
    backfill: text({ enum: ["pending", "done"] })
      .notNull()
      .default("pending"),
  },
  (table) => [index("channel_guild_id_idx").on(table.guildId)],
);

export { channel, guild, role };
export type { PermissionOverwrite };
