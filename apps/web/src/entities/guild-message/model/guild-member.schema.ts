import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const guildMember = sqliteTable(
  "member",
  {
    userId: text().primaryKey(),
    sealed: text().notNull(),
    roles: text({ mode: "json" }).$type<readonly string[]>().notNull(),
    bot: integer({ mode: "boolean" }).notNull(),
    joinedAt: integer(),
    leftAt: integer(),
    updatedAt: integer().notNull(),
  },
  (table) => [index("member_joined_idx").on(table.joinedAt)],
);

export { guildMember };
