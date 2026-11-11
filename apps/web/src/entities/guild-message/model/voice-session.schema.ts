import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const PRECISIONS = ["exact", "noLaterThan"] as const;

const voiceSession = sqliteTable(
  "voice_session",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: text().notNull(),
    channelId: text().notNull(),
    joinedAt: integer().notNull(),
    joinPrecision: text({ enum: PRECISIONS }).notNull(),
    leftAt: integer(),
    leavePrecision: text({ enum: PRECISIONS }),
  },
  (table) => [
    index("voice_session_user_idx").on(table.userId, table.leftAt),
    index("voice_session_joined_idx").on(table.joinedAt),
  ],
);

export { PRECISIONS, voiceSession };
