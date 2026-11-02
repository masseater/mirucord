import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const auditEntry = sqliteTable(
  "audit_entry",
  {
    id: text().primaryKey(),
    actionType: integer().notNull(),
    userId: text(),
    targetId: text(),
    at: integer().notNull(),
    sealed: text().notNull(),
  },
  (table) => [
    index("audit_entry_at_idx").on(table.at),
    index("audit_entry_user_idx").on(table.userId),
    index("audit_entry_target_idx").on(table.targetId),
  ],
);

export { auditEntry };
