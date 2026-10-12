import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const phraseUse = sqliteTable(
  "phrase_use",
  {
    messageId: text().notNull(),
    phrase: text().notNull(),
    common: text().notNull(),
    channelId: text().notNull(),
    authorId: text().notNull(),
    createdAt: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.messageId, table.phrase] }),
    index("phrase_use_created_idx").on(table.createdAt),
    index("phrase_use_phrase_idx").on(table.phrase, table.createdAt),
    index("phrase_use_author_idx").on(table.authorId),
    index("phrase_use_channel_idx").on(table.channelId),
  ],
);

export { phraseUse };
