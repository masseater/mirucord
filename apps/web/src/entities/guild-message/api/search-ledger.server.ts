import { and, asc, count, gt, gte, inArray, isNotNull, lt, max, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Option } from "effect";

import { guildMessage } from "#/entities/guild-message/model/guild-message.schema";
import { searchInvalid, searchSegment } from "#/entities/guild-message/model/search-segment.schema";
import { BOUND_LIMIT } from "#/entities/guild-message/model/stored-message";
import type { TrackedRow } from "#/entities/guild-message/model/stored-message";

const EARLIEST = 0;
const NONE = 0;
const NO_VERSION = 0;
const NEXT_VERSION = 1;

type Segment = typeof searchSegment.$inferSelect;

type Position = Readonly<{ segment: string; ordinal: number }>;

type Range = Readonly<{ from: number; to: Option.Option<number> }>;

const covers = ({ from, to }: Range, createdAt: number): boolean =>
  createdAt >= from &&
  Option.match(to, { onNone: () => true, onSome: (upper) => createdAt < upper });

const rangeOf = (segment: Segment): Range => ({
  from: segment.fromCreatedAt,
  to: Option.fromNullOr(segment.toCreatedAt),
});

const inRange = ({ from, to }: Range): SQL => {
  const lower = gte(guildMessage.createdAt, from);
  return Option.match(to, {
    onNone: () => lower,
    onSome: (upper) => and(lower, lt(guildMessage.createdAt, upper)) ?? lower,
  });
};

const segmentsOf = (db: DrizzleSqliteDODatabase): readonly Segment[] =>
  db.select().from(searchSegment).orderBy(asc(searchSegment.fromCreatedAt)).all();

const sealedOf = (segments: readonly Segment[]): readonly Segment[] =>
  segments.filter(({ kind }) => kind === "sealed");

const recentOf = (segments: readonly Segment[]): Option.Option<Segment> =>
  Option.fromUndefinedOr(segments.find(({ kind }) => kind === "recent"));

const coveredUpTo = (sealed: readonly Segment[]): Option.Option<Option.Option<number>> =>
  Option.map(Array.last(sealed), (segment) => rangeOf(segment).to);

const uncoveredCondition = (sealed: readonly Segment[]): Option.Option<SQL> =>
  Option.match(coveredUpTo(sealed), {
    onNone: () => Option.some(gte(guildMessage.createdAt, EARLIEST)),
    onSome: Option.map((bound) => gte(guildMessage.createdAt, bound)),
  });

const uncoveredFrom = (sealed: readonly Segment[]): number =>
  Option.getOrElse(Option.flatten(coveredUpTo(sealed)), () => EARLIEST);

const staleCondition = (segment: Segment): SQL =>
  and(inRange(rangeOf(segment)), gt(guildMessage.version, segment.builtThrough)) ??
  inRange(rangeOf(segment));

const pendingCondition = (sealed: readonly Segment[]): SQL => {
  const indexed = isNotNull(guildMessage.tokens);
  const stale = [
    ...sealed.map((segment) => staleCondition(segment)),
    ...Option.toArray(uncoveredCondition(sealed)),
  ];
  return and(indexed, or(...stale)) ?? indexed;
};

const countWhere = (db: DrizzleSqliteDODatabase, condition: SQL): number => {
  const counted = db.select({ rows: count() }).from(guildMessage).where(condition).get();
  return Option.match(Option.fromUndefinedOr(counted), {
    onNone: () => NONE,
    onSome: ({ rows }) => rows,
  });
};

const latestVersionWhere = (db: DrizzleSqliteDODatabase, condition: Option.Option<SQL>): number => {
  const query = db.select({ latest: max(guildMessage.version) }).from(guildMessage);
  const found = Option.match(condition, {
    onNone: () => query.get(),
    onSome: (where) => query.where(where).get(),
  });
  return Option.getOrElse(
    Option.flatMap(Option.fromUndefinedOr(found), ({ latest }) => Option.fromNullOr(latest)),
    () => NO_VERSION,
  );
};

const ordinalIn = (segment: Segment, id: string): Option.Option<Position> =>
  Option.liftPredicate(segment.ids.indexOf(id), (ordinal) => ordinal >= NONE).pipe(
    Option.map((ordinal) => ({ segment: segment.name, ordinal })),
  );

const homeOf = (sealed: readonly Segment[], row: TrackedRow): Option.Option<Segment> =>
  Option.fromUndefinedOr(sealed.find((segment) => covers(rangeOf(segment), row.createdAt))).pipe(
    Option.filter((segment) => row.version <= segment.builtThrough),
  );

const positionsOf = (
  db: DrizzleSqliteDODatabase,
  rows: readonly TrackedRow[],
): readonly Position[] => {
  const segments = segmentsOf(db);
  const sealed = sealedOf(segments);
  const recent = recentOf(segments);
  return rows.flatMap((row) =>
    Option.toArray(
      Option.match(homeOf(sealed, row), {
        onSome: (segment) => ordinalIn(segment, row.id),
        onNone: () => recent.pipe(Option.flatMap((segment) => ordinalIn(segment, row.id))),
      }),
    ),
  );
};

const invalidate = (
  db: DrizzleSqliteDODatabase,
  positions: readonly Position[],
  now: number,
): boolean => {
  for (const chunk of Array.chunksOf(positions, BOUND_LIMIT)) {
    db.insert(searchInvalid)
      .values(chunk.map(({ segment, ordinal }) => ({ segment, ordinal, since: now })))
      .onConflictDoNothing()
      .run();
  }
  return Array.isReadonlyArrayNonEmpty(positions);
};

const segmentNames = (segments: readonly Segment[]): readonly string[] =>
  segments.map(({ name }) => name);

const invalidSince = (
  db: DrizzleSqliteDODatabase,
  names: readonly string[],
): Option.Option<number> => {
  if (Array.isReadonlyArrayEmpty(names)) {
    return Option.none();
  }
  const oldest = db
    .select({ since: searchInvalid.since })
    .from(searchInvalid)
    .where(inArray(searchInvalid.segment, [...names]))
    .orderBy(asc(searchInvalid.since))
    .get();
  return Option.map(Option.fromUndefinedOr(oldest), ({ since }) => since);
};

type SearchLedger = Readonly<{
  segments: () => readonly Segment[];
  count: (condition: SQL) => number;
  latestVersion: () => number;
  nextVersion: () => number;
  latestPending: (sealed: readonly Segment[]) => number;
  positions: (rows: readonly TrackedRow[]) => readonly Position[];
  invalidate: (positions: readonly Position[], now: number) => boolean;
  oldestInvalid: (names: readonly string[]) => Option.Option<number>;
}>;

const searchLedger = (db: DrizzleSqliteDODatabase): SearchLedger => ({
  segments: (): readonly Segment[] => segmentsOf(db),
  count: (condition: SQL): number => countWhere(db, condition),
  latestVersion: (): number => latestVersionWhere(db, Option.none()),
  nextVersion: (): number => latestVersionWhere(db, Option.none()) + NEXT_VERSION,
  latestPending: (sealed: readonly Segment[]): number =>
    latestVersionWhere(db, Option.some(pendingCondition(sealed))),
  positions: (rows: readonly TrackedRow[]): readonly Position[] => positionsOf(db, rows),
  invalidate: (positions: readonly Position[], now: number): boolean =>
    invalidate(db, positions, now),
  oldestInvalid: (names: readonly string[]): Option.Option<number> => invalidSince(db, names),
});

export {
  EARLIEST,
  inRange,
  pendingCondition,
  rangeOf,
  recentOf,
  sealedOf,
  segmentNames,
  searchLedger,
  staleCondition,
  uncoveredCondition,
  uncoveredFrom,
};
export type { Position, Range, SearchLedger, Segment };
