import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const NEVER_BUILT = 0;

export const searchSegment = sqliteTable("search_segment", {
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

export const searchInvalid = sqliteTable(
  "search_invalid",
  {
    segment: text().notNull(),
    ordinal: integer().notNull(),
    since: integer().notNull(),
  },
  (table) => [primaryKey({ columns: [table.segment, table.ordinal] })],
);

export const searchChannel = sqliteTable("search_channel", {
  id: text().primaryKey(),
  position: integer().notNull().unique(),
});

export type ArchivePiece = Readonly<{
  name: string;
  offset: number;
  count: number;
  shards: number;
}>;

export const searchArchive = sqliteTable("search_archive", {
  name: text().primaryKey(),
  status: text({ enum: ["live", "building"] }).notNull(),
  shards: integer().notNull(),
  count: integer().notNull(),
  pieces: text({ mode: "json" }).$type<readonly ArchivePiece[]>().notNull(),
  sources: text({ mode: "json" }).$type<readonly string[]>().notNull(),
  nextShard: integer().notNull(),
});
