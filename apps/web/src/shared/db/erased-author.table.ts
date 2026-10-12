import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const erasedAuthor = sqliteTable("erased_author", {
  id: text().primaryKey(),
  erasedAt: integer({ mode: "timestamp_ms" }).notNull(),
});

export { erasedAuthor };
