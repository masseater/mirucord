import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const guildMessage = sqliteTable(
  "message",
  {
    seq: integer().primaryKey({ autoIncrement: true }),
    id: text().notNull().unique(),
    channelId: text().notNull(),
    authorId: text().notNull(),
    sealed: text().notNull(),
    createdAt: integer().notNull(),
    editedAt: integer(),
    describedWith: text(),
    phrases: text().$type<"pending" | "extracted">().notNull().default("pending"),
  },
  (table) => [
    index("message_channel_created_idx").on(table.channelId, table.createdAt),
    index("message_phrases_created_idx").on(table.phrases, table.createdAt),
  ],
);

export { guildMessage };
