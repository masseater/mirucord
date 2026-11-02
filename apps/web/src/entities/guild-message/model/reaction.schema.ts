import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const reaction = sqliteTable(
  "reaction",
  {
    messageId: text().notNull(),
    channelId: text().notNull(),
    userId: text().notNull(),
    messageAuthorId: text(),
    emoji: text().notNull(),
    burst: integer({ mode: "boolean" }).notNull(),
    reactedAt: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.messageId, table.userId, table.emoji, table.burst] }),
    index("reaction_user_idx").on(table.userId, table.reactedAt),
    index("reaction_author_idx").on(table.messageAuthorId, table.reactedAt),
    index("reaction_at_idx").on(table.reactedAt),
  ],
);

const pollVote = sqliteTable(
  "poll_vote",
  {
    messageId: text().notNull(),
    channelId: text().notNull(),
    userId: text().notNull(),
    answerId: integer().notNull(),
    votedAt: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.messageId, table.userId, table.answerId] }),
    index("poll_vote_user_idx").on(table.userId, table.votedAt),
  ],
);

export { pollVote, reaction };
