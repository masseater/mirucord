import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const threadMember = sqliteTable(
  "thread_member",
  {
    threadId: text().notNull(),
    userId: text().notNull(),
    joinedAt: integer().notNull(),
    leftAt: integer(),
  },
  (table) => [
    primaryKey({ columns: [table.threadId, table.userId] }),
    index("thread_member_user_idx").on(table.userId),
  ],
);

export { threadMember };
