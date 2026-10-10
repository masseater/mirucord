import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const syncRun = sqliteTable("sync_run", {
  scope: text().primaryKey(),
  ranAt: integer({ mode: "timestamp_ms" }).notNull(),
});

export { syncRun };
