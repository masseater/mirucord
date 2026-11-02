import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const scheduledEvent = sqliteTable(
  "scheduled_event",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    description: text(),
    channelId: text(),
    creatorId: text(),
    location: text(),
    entityType: integer().notNull(),
    status: integer().notNull(),
    startsAt: integer().notNull(),
    endsAt: integer(),
    recurring: integer({ mode: "boolean" }).notNull(),
    updatedAt: integer().notNull(),
    removedAt: integer(),
  },
  (table) => [
    index("scheduled_event_start_idx").on(table.startsAt),
    index("scheduled_event_creator_idx").on(table.creatorId),
  ],
);

const eventInterest = sqliteTable(
  "event_interest",
  {
    eventId: text().notNull(),
    userId: text().notNull(),
    interestedAt: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.userId] }),
    index("event_interest_user_idx").on(table.userId),
  ],
);

export { eventInterest, scheduledEvent };
