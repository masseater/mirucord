import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const guildMessage = sqliteTable(
  "message",
  {
    seq: integer().primaryKey(),
    id: text().notNull().unique(),
    channelId: text().notNull(),
    authorId: text().notNull(),
    sealed: text().notNull(),
    createdAt: integer().notNull(),
    editedAt: integer(),
    describedWith: text(),
  },
  (table) => [index("message_channel_created_idx").on(table.channelId, table.createdAt)],
);

export { guildMessage };
