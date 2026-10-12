import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const messageSearch = sqliteTable("message_search", {
  rowid: integer().primaryKey(),
  tokens: text().notNull(),
  messageSearch: text("message_search"),
});

export { messageSearch };
