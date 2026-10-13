import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const NEVER_BUILT = 0;

const searchSegment = sqliteTable("search_segment", {
  name: text().primaryKey(),
  kind: text({ enum: ["sealed", "recent"] }).notNull(),
  fromCreatedAt: integer().notNull(),
  toCreatedAt: integer(),
  builtThrough: integer().notNull(),
  builtAt: integer().notNull().default(NEVER_BUILT),
  count: integer().notNull(),
  shards: integer().notNull(),
  ids: text({ mode: "json" }).$type<readonly string[]>().notNull(),
  vectorThrough: integer(),
  vectorClusters: integer(),
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
