import type { ScheduledEventChange } from "@repo/ingest-util-gateway-contract";
import { and, eq } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Match, Option, Order, pipe, Record } from "effect";

import {
  eventInterest,
  scheduledEvent,
} from "#/entities/guild-message/model/scheduled-event.schema";

import type {
  ScheduledEventLookup,
  ScheduledEventPage,
  StoredScheduledEvent,
} from "./scheduled-event-types";
import { unlessErased } from "./unless-erased";

type ScheduledEventLedger = Readonly<{
  change: (changes: readonly ScheduledEventChange[], erased: readonly string[]) => void;
  read: (lookup: ScheduledEventLookup, erased: readonly string[]) => ScheduledEventPage;
  forget: (userId: string) => void;
}>;

type Change<Kind extends ScheduledEventChange["kind"]> = Extract<
  ScheduledEventChange,
  Readonly<{ kind: Kind }>
>;

type EventRow = typeof scheduledEvent.$inferSelect;

const NO_ONE = Option.getOrNull(Option.none<string>());

const scheduleOf = (db: DrizzleSqliteDODatabase, change: Change<"schedule">): void => {
  const { kind: _kind, eventId, at, ...fields } = change;
  const row = { ...fields, updatedAt: at, removedAt: Option.getOrNull(Option.none<number>()) };
  db.insert(scheduledEvent)
    .values({ id: eventId, ...row })
    .onConflictDoUpdate({ target: scheduledEvent.id, set: row })
    .run();
};

const unscheduleOf = (db: DrizzleSqliteDODatabase, { eventId, at }: Change<"unschedule">): void => {
  db.update(scheduledEvent)
    .set({ removedAt: at, updatedAt: at })
    .where(eq(scheduledEvent.id, eventId))
    .run();
};

const interestOf = (
  db: DrizzleSqliteDODatabase,
  { eventId, userId, at }: Change<"interest">,
): void => {
  db.insert(eventInterest)
    .values({ eventId, userId, interestedAt: at })
    .onConflictDoNothing()
    .run();
};

const uninterestOf = (
  db: DrizzleSqliteDODatabase,
  { eventId, userId }: Change<"uninterest">,
): void => {
  db.delete(eventInterest)
    .where(and(eq(eventInterest.eventId, eventId), eq(eventInterest.userId, userId)))
    .run();
};

const changeOf = (db: DrizzleSqliteDODatabase, change: ScheduledEventChange): void => {
  Match.value(change).pipe(
    Match.discriminatorsExhaustive("kind")({
      schedule: (scheduled) => {
        scheduleOf(db, scheduled);
      },
      unschedule: (unscheduled) => {
        unscheduleOf(db, unscheduled);
      },
      interest: (interested) => {
        interestOf(db, interested);
      },
      uninterest: (uninterested) => {
        uninterestOf(db, uninterested);
      },
    }),
  );
};

const isVisible =
  (lookup: ScheduledEventLookup) =>
  ({ channelId }: EventRow): boolean =>
    Option.match(Option.fromNullOr(channelId), {
      onNone: () => true,
      onSome: (id) => lookup.channelIds.includes(id),
    });

const inSpan =
  (lookup: ScheduledEventLookup) =>
  ({ startsAt, endsAt }: EventRow): boolean => {
    const after = Option.match(Option.fromNullOr(lookup.since), {
      onNone: () => true,
      onSome: (since) => (endsAt ?? startsAt) >= since,
    });
    const before = Option.match(Option.fromNullOr(lookup.until), {
      onNone: () => true,
      onSome: (until) => startsAt <= until,
    });
    return after && before;
  };

const involves =
  (lookup: ScheduledEventLookup) =>
  (event: StoredScheduledEvent): boolean =>
    Option.match(Option.fromNullOr(lookup.userIds), {
      onNone: () => true,
      onSome: (ids) =>
        ids.includes(event.creatorId ?? "") ||
        Array.isReadonlyArrayNonEmpty(Array.intersection(event.interestedUserIds, ids)),
    });

const eventRowsOf = (
  db: DrizzleSqliteDODatabase,
  lookup: ScheduledEventLookup,
): readonly EventRow[] =>
  Option.match(Option.fromNullOr(lookup.eventId), {
    onNone: () => db.select().from(scheduledEvent).all(),
    onSome: (id) => db.select().from(scheduledEvent).where(eq(scheduledEvent.id, id)).all(),
  });

const userIdsOf = (interests: readonly (typeof eventInterest.$inferSelect)[]): readonly string[] =>
  pipe(
    interests,
    Array.map(({ userId }) => userId),
  );

const interestsOf = (
  db: DrizzleSqliteDODatabase,
  erased: readonly string[],
): ReadonlyMap<string, readonly string[]> => {
  const rows = pipe(
    db.select().from(eventInterest).all(),
    Array.filter(({ userId }) => !erased.includes(userId)),
  );
  const byEvent = Array.groupBy(rows, ({ eventId }) => eventId);
  return new Map(
    pipe(
      Record.toEntries(byEvent),
      Array.map(([eventId, interests]) => [eventId, userIdsOf(interests)] as const),
    ),
  );
};

const soonestFirst = Order.mapInput(Order.Number, ({ startsAt }: StoredScheduledEvent) => startsAt);

const readOf = (
  db: DrizzleSqliteDODatabase,
  lookup: ScheduledEventLookup,
  erased: readonly string[],
): ScheduledEventPage => {
  const interests = interestsOf(db, erased);
  const matching = pipe(
    eventRowsOf(db, lookup),
    Array.filter((row) => isVisible(lookup)(row) && inSpan(lookup)(row)),
    Array.map((row) => ({ ...row, interestedUserIds: interests.get(row.id) ?? [] })),
    Array.filter(involves(lookup)),
  );
  const events = Array.sort(matching, soonestFirst);
  return {
    total: events.length,
    events: events.slice(lookup.offset, lookup.offset + lookup.limit),
  };
};

const withoutErasedCreator = (
  change: ScheduledEventChange,
  erased: readonly string[],
): ScheduledEventChange => {
  if (change.kind === "schedule" && erased.includes(change.creatorId ?? "")) {
    return { ...change, creatorId: NO_ONE };
  }
  return change;
};

const scheduledEventLedger = (db: DrizzleSqliteDODatabase): ScheduledEventLedger => ({
  change: (changes, erased) => {
    unlessErased((change: ScheduledEventChange) => {
      changeOf(db, withoutErasedCreator(change, erased));
    })(changes, erased);
  },
  read: (lookup, erased) => readOf(db, lookup, erased),
  forget: (userId) => {
    db.delete(eventInterest).where(eq(eventInterest.userId, userId)).run();
    db.update(scheduledEvent)
      .set({ creatorId: NO_ONE })
      .where(eq(scheduledEvent.creatorId, userId))
      .run();
  },
});

export { scheduledEventLedger };
export type { ScheduledEventLedger };
export type { ScheduledEventLookup, ScheduledEventPage } from "./scheduled-event-types";
