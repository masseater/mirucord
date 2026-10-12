import { sqliteTable, text } from "drizzle-orm/sqlite-core";

const erasedAuthor = sqliteTable("erased_author", {
  id: text().primaryKey(),
});

export { erasedAuthor };
