import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

type InviteCandidate = Readonly<{
  code: string;
  inviterId: string | null;
  channelId: string | null;
}>;

const guildInvite = sqliteTable("invite", {
  code: text().primaryKey(),
  inviterId: text(),
  channelId: text(),
  uses: integer().notNull(),
  maxUses: integer().notNull(),
});

const inviteSnapshot = sqliteTable("invite_snapshot", {
  id: integer().primaryKey(),
  fetchedAt: integer().notNull(),
});

const inviteJoin = sqliteTable(
  "invite_join",
  {
    userId: text().notNull(),
    joinedAt: integer().notNull(),
    precision: text({ enum: ["exact", "ambiguous", "unknown"] }).notNull(),
    candidates: text({ mode: "json" }).$type<readonly InviteCandidate[]>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.joinedAt] })],
);

export { guildInvite, inviteJoin, inviteSnapshot };
export type { InviteCandidate };
