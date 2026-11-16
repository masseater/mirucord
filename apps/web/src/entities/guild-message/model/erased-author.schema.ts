import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const erasedAuthor = sqliteTable("erased_author", {
  id: text().primaryKey(),
});
