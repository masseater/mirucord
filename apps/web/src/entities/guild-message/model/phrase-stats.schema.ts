import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const phraseStats = sqliteTable("phrase_stats", {
  visibility: text().primaryKey(),
  body: text().notNull(),
  written: integer().notNull(),
  computedAt: integer().notNull(),
});

const phraseLedger = sqliteTable("phrase_ledger", {
  id: integer().primaryKey(),
  guildId: text(),
  written: integer().notNull(),
  generation: integer().notNull(),
  backfillRequestedAt: integer().notNull(),
});

export { phraseLedger, phraseStats };
