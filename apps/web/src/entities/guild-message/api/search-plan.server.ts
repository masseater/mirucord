import { and, asc, desc, inArray, isNotNull, lt } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Number, Option, Order, pipe } from "effect";

import { guildMessage } from "#/entities/guild-message/model/guild-message.schema";
import { searchInvalid } from "#/entities/guild-message/model/search-segment.schema";

import {
  inRange,
  pendingCondition,
  rangeOf,
  sealedOf,
  segmentNames,
  searchLedger,
  staleCondition,
  uncoveredCondition,
  uncoveredFrom,
} from "./search-ledger.server";
import type { Range, Segment } from "./search-ledger.server";

const RECENT_LIMIT = 500;
const RECENT_MAX = 2000;
const PIECE_TARGET = 12_000;
const SPLIT_ABOVE = 18_000;
const PURGE_AFTER_MS = 3_600_000;
const NONE = 0;
const NEXT = 1;
const LAST = -1;

type PieceRow = Readonly<{
  id: string;
  channelId: string;
  createdAt: number;
  tokens: readonly number[];
}>;

type PieceSpec = Readonly<{ range: Range; rows: readonly PieceRow[] }>;

type Plan =
  | Readonly<{ status: "rebuild"; replaced: readonly Segment[]; pieces: readonly PieceSpec[] }>
  | Readonly<{ status: "recentOnly" }>;

const RECENT_ONLY: Plan = { status: "recentOnly" };

const PIECE_COLUMNS = {
  id: guildMessage.id,
  channelId: guildMessage.channelId,
  createdAt: guildMessage.createdAt,
  tokens: guildMessage.tokens,
};

const NEWEST_FIRST = [desc(guildMessage.createdAt), desc(guildMessage.id)];

type LoadedRow = Readonly<{
  id: string;
  channelId: string;
  createdAt: number;
  tokens: readonly number[] | null;
}>;

const toPieceRows = (rows: readonly LoadedRow[]): readonly PieceRow[] =>
  pipe(
    rows,
    Array.map(({ id, channelId, createdAt, tokens }) => ({
      id,
      channelId,
      createdAt,
      tokens: Option.getOrElse(Option.fromNullOr(tokens), (): readonly number[] => []),
    })),
  );

const rowsIn = (db: DrizzleSqliteDODatabase, range: Range): readonly PieceRow[] => {
  const indexedInRange = and(inRange(range), isNotNull(guildMessage.tokens));
  return toPieceRows(
    db
      .select(PIECE_COLUMNS)
      .from(guildMessage)
      .where(indexedInRange)
      .orderBy(...NEWEST_FIRST)
      .all(),
  );
};

const cutIndex = (oldestFirst: readonly PieceRow[]): Option.Option<number> =>
  pipe(
    oldestFirst,
    Array.findFirstIndex(
      (row, index) =>
        index >= PIECE_TARGET &&
        row.createdAt !==
          Option.getOrElse(Option.fromUndefinedOr(oldestFirst[index - NEXT]), () => row).createdAt,
    ),
  );

const splitPieces = (range: Range, rows: readonly PieceRow[]): readonly PieceSpec[] => {
  const oldestFirst = Array.reverse(rows);
  return pipe(
    cutIndex(oldestFirst),
    Option.filter(() => rows.length > SPLIT_ABOVE),
    Option.match({
      onNone: (): readonly PieceSpec[] => [{ range, rows }],
      onSome: (cut): readonly PieceSpec[] => {
        const boundary = Option.getOrElse(
          Option.map(Option.fromUndefinedOr(oldestFirst[cut]), ({ createdAt }) => createdAt),
          () => range.from,
        );
        return [
          {
            range: { from: range.from, to: Option.some(boundary) },
            rows: Array.reverse(oldestFirst.slice(NONE, cut)),
          },
          ...splitPieces({ from: boundary, to: range.to }, Array.reverse(oldestFirst.slice(cut))),
        ];
      },
    }),
  );
};

const closedEnd = (stamps: readonly number[]): Option.Option<number> =>
  Option.fromUndefinedOr(stamps.at(LAST)).pipe(
    Option.filter((tail) => stamps.length > PIECE_TARGET && tail !== stamps[NONE]),
  );

const uncoveredPiece = (
  db: DrizzleSqliteDODatabase,
  sealed: readonly Segment[],
): Option.Option<PieceSpec> =>
  Option.flatMap(uncoveredCondition(sealed), (condition) => {
    const rows = db
      .select({ createdAt: guildMessage.createdAt })
      .from(guildMessage)
      .where(and(condition, isNotNull(guildMessage.tokens)))
      .orderBy(asc(guildMessage.createdAt))
      .limit(PIECE_TARGET + NEXT)
      .all();
    const stamps = pipe(
      rows,
      Array.map(({ createdAt }) => createdAt),
    );
    const range: Range = { from: uncoveredFrom(sealed), to: closedEnd(stamps) };
    return Option.map(
      Option.liftPredicate(stamps, Array.isReadonlyArrayNonEmpty),
      (): PieceSpec => ({ range, rows: rowsIn(db, range) }),
    );
  });

const overdueNames = (
  db: DrizzleSqliteDODatabase,
  sealed: readonly Segment[],
  now: number,
): ReadonlySet<string> => {
  const names = segmentNames(sealed);
  if (Array.isReadonlyArrayEmpty(names)) {
    return new Set();
  }
  const rows = db
    .selectDistinct({ segment: searchInvalid.segment })
    .from(searchInvalid)
    .where(
      and(
        lt(searchInvalid.since, now - PURGE_AFTER_MS),
        inArray(searchInvalid.segment, [...names]),
      ),
    )
    .all();
  return new Set(
    pipe(
      rows,
      Array.map(({ segment }) => segment),
    ),
  );
};

type RankedSegment = Readonly<{ segment: Segment; pending: number }>;

const byPendingDesc = Order.mapInput(
  Order.flip(Number.Order),
  ({ pending }: RankedSegment) => pending,
);

const stalestTarget = (
  db: DrizzleSqliteDODatabase,
  sealed: readonly Segment[],
  now: number,
): Option.Option<Segment> => {
  const overdue = overdueNames(db, sealed, now);
  const ledger = searchLedger(db);
  const ranked = pipe(
    sealed,
    Array.map((segment) => ({ segment, pending: ledger.count(staleCondition(segment)) })),
    Array.filter(({ segment, pending }) => pending > NONE || overdue.has(segment.name)),
  );
  return Option.map(Array.head(Array.sort(ranked, byPendingDesc)), ({ segment }) => segment);
};

const rebuildOf = (db: DrizzleSqliteDODatabase, segment: Segment): Plan => ({
  status: "rebuild",
  replaced: [segment],
  pieces: splitPieces(rangeOf(segment), rowsIn(db, rangeOf(segment))),
});

const planOf = (db: DrizzleSqliteDODatabase, now: number): Plan => {
  const sealed = sealedOf(searchLedger(db).segments());
  const pending = searchLedger(db).count(pendingCondition(sealed));
  if (pending <= RECENT_LIMIT && overdueNames(db, sealed, now).size === NONE) {
    return RECENT_ONLY;
  }
  const uncovered = uncoveredPiece(db, sealed).pipe(
    Option.filter(({ rows }) => Array.isReadonlyArrayEmpty(sealed) || rows.length > RECENT_LIMIT),
  );
  return Option.match(uncovered, {
    onSome: (piece): Plan => ({ status: "rebuild", replaced: [], pieces: [piece] }),
    onNone: () =>
      Option.match(stalestTarget(db, sealed, now), {
        onNone: () => RECENT_ONLY,
        onSome: (segment) => rebuildOf(db, segment),
      }),
  });
};

const recentRows = (db: DrizzleSqliteDODatabase, sealed: readonly Segment[]): readonly PieceRow[] =>
  toPieceRows(
    db
      .select(PIECE_COLUMNS)
      .from(guildMessage)
      .where(pendingCondition(sealed))
      .orderBy(...NEWEST_FIRST)
      .limit(RECENT_MAX)
      .all(),
  );

type SearchPlanner = Readonly<{
  plan: (now: number) => Plan;
  recentRows: (sealed: readonly Segment[]) => readonly PieceRow[];
}>;

const searchPlanner = (db: DrizzleSqliteDODatabase): SearchPlanner => ({
  plan: (now) => planOf(db, now),
  recentRows: (sealed) => recentRows(db, sealed),
});

export { PURGE_AFTER_MS, searchPlanner };
export type { PieceRow, PieceSpec, Plan, SearchPlanner };
