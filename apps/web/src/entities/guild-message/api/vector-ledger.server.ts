import { and, count, eq, gt, inArray, isNotNull, isNull, max } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Option, pipe } from "effect";

import { BOUND_LIMIT, guildMessage } from "#/entities/guild-message/model/guild-message.schema";
import { searchSegment } from "#/entities/guild-message/model/search-segment.schema";

import { inRange, rangeOf, searchLedger } from "./search-ledger.server";
import type { Segment } from "./search-ledger.server";

const NO_VECTOR = 0;
const ONE_ROW = 1;

type StoredVector = Readonly<{ id: string; channelId: string; vector: Uint8Array | null }>;

type Coverage = Readonly<{ stored: number; embedded: number }>;

const hasRow = (db: DrizzleSqliteDODatabase, condition: SQL): boolean =>
  Option.isSome(
    Option.fromUndefinedOr(
      db.select({ id: guildMessage.id }).from(guildMessage).where(condition).limit(ONE_ROW).get(),
    ),
  );

const segmentConditions = (segment: Segment): readonly SQL[] => {
  if (segment.kind === "sealed") {
    const range = inRange(rangeOf(segment));
    return [and(range, isNotNull(guildMessage.tokens)) ?? range];
  }
  return pipe(
    Array.chunksOf(segment.ids, BOUND_LIMIT),
    Array.map((chunk) => inArray(guildMessage.id, [...chunk])),
  );
};

const anyWhere = (db: DrizzleSqliteDODatabase, segment: Segment, extra: SQL): boolean =>
  pipe(
    segmentConditions(segment),
    Array.some((condition) => hasRow(db, and(condition, extra) ?? condition)),
  );

const latestVectorAt = (db: DrizzleSqliteDODatabase): number =>
  Option.fromUndefinedOr(
    db
      .select({ at: max(guildMessage.vectorAt) })
      .from(guildMessage)
      .get(),
  ).pipe(
    Option.flatMap(({ at }) => Option.fromNullOr(at)),
    Option.getOrElse(() => NO_VECTOR),
  );

const isStale = (db: DrizzleSqliteDODatabase, segment: Segment): boolean =>
  Option.match(Option.fromNullOr(segment.vectorThrough), {
    onNone: () => true,
    onSome: (through) => anyWhere(db, segment, gt(guildMessage.vectorAt, through)),
  });

const isReady = (db: DrizzleSqliteDODatabase, segment: Segment): boolean =>
  segment.kind === "recent" || !anyWhere(db, segment, isNull(guildMessage.vector));

const staleSegments = (db: DrizzleSqliteDODatabase): readonly Segment[] =>
  pipe(
    searchLedger(db).segments(),
    Array.filter((segment) => isStale(db, segment) && isReady(db, segment)),
  );

const storedVectors = (
  db: DrizzleSqliteDODatabase,
  ids: readonly string[],
): readonly StoredVector[] =>
  pipe(
    Array.chunksOf(ids, BOUND_LIMIT),
    Array.flatMap((chunk) =>
      db
        .select({
          id: guildMessage.id,
          channelId: guildMessage.channelId,
          vector: guildMessage.vector,
        })
        .from(guildMessage)
        .where(inArray(guildMessage.id, [...chunk]))
        .all(),
    ),
  );

const markPublished = (
  db: DrizzleSqliteDODatabase,
  { segment, through, clusters }: Readonly<{ segment: Segment; through: number; clusters: number }>,
): void => {
  db.update(searchSegment)
    .set({ vectorThrough: through, vectorClusters: clusters })
    .where(eq(searchSegment.name, segment.name))
    .run();
};

const coverageOf = (db: DrizzleSqliteDODatabase): Coverage => {
  const found = db
    .select({ stored: count(), embedded: count(guildMessage.vector) })
    .from(guildMessage)
    .get();
  return Option.getOrElse(Option.fromUndefinedOr(found), () => ({
    stored: NO_VECTOR,
    embedded: NO_VECTOR,
  }));
};

type VectorLedger = Readonly<{
  coverage: () => Coverage;
  latestVectorAt: () => number;
  staleSegments: () => readonly Segment[];
  storedVectors: (ids: readonly string[]) => readonly StoredVector[];
  markPublished: (
    published: Readonly<{ segment: Segment; through: number; clusters: number }>,
  ) => void;
}>;

const vectorLedger = (db: DrizzleSqliteDODatabase): VectorLedger => ({
  coverage: (): Coverage => coverageOf(db),
  latestVectorAt: (): number => latestVectorAt(db),
  staleSegments: (): readonly Segment[] => staleSegments(db),
  storedVectors: (ids: readonly string[]): readonly StoredVector[] => storedVectors(db, ids),
  markPublished: (published): void => {
    markPublished(db, published);
  },
});

export { vectorLedger };
export type { Coverage, StoredVector, VectorLedger };
