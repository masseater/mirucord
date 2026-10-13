import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { NoteStatus } from "#/entities/guild-message/api/store-types";

const phraseNote = sqliteTable("phrase_note", {
  phrase: text().primaryKey(),
  status: text().$type<NoteStatus>().notNull(),
  sealed: text(),
  examples: text().notNull(),
  updatedAt: integer().notNull(),
});

export { phraseNote };
