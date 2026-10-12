import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const searchSegment = sqliteTable("search_segment", {
  name: text().primaryKey(),
  kind: text({ enum: ["sealed", "recent"] }).notNull(),
  fromCreatedAt: integer().notNull(),
  toCreatedAt: integer(),
  builtThrough: integer().notNull(),
  count: integer().notNull(),
  shards: integer().notNull(),
  ids: text({ mode: "json" }).$type<readonly string[]>().notNull(),
});

const searchInvalid = sqliteTable(
  "search_invalid",
  {
    segment: text().notNull(),
    ordinal: integer().notNull(),
    since: integer().notNull(),
  },
  (table) => [primaryKey({ columns: [table.segment, table.ordinal] })],
);

export { searchInvalid, searchSegment };
