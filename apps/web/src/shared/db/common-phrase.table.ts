import { index, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { guild } from "./guild.table";

const commonPhrase = sqliteTable(
  "common_phrase",
  {
    phrase: text().notNull(),
    guildId: text()
      .notNull()
      .references(() => guild.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.phrase, table.guildId] }),
    index("common_phrase_guild_idx").on(table.guildId),
  ],
);

export { commonPhrase };
