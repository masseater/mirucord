import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { channel, guild } from "./guild.table";

export const message = sqliteTable(
  "message",
  {
    id: text().primaryKey(),
    guildId: text()
      .notNull()
      .references(() => guild.id, { onDelete: "cascade" }),
    channelId: text()
      .notNull()
      .references(() => channel.id, { onDelete: "cascade" }),
    authorId: text().notNull(),
    sealed: text().notNull(),
    createdAt: integer({ mode: "timestamp_ms" }).notNull(),
    editedAt: integer({ mode: "timestamp_ms" }),
  },
  (table) => [index("message_channel_id_idx").on(table.channelId, table.id)],
);
