import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "#/shared/auth/generated/auth.table";

const linkedAccount = sqliteTable(
  "linked_account",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    discordUserId: text().notNull(),
    type: text().notNull(),
    name: text().notNull(),
    verified: integer({ mode: "boolean" }).notNull(),
    publishedAt: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.discordUserId, table.type, table.name] }),
    index("linked_account_user_idx").on(table.userId),
  ],
);

export { linkedAccount };
