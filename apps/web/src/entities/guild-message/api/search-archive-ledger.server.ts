import { and, eq } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Number, Option, Order } from "effect";

import { searchArchive } from "#/entities/guild-message/model/search-segment.schema";
import type { ArchivePiece } from "#/entities/guild-message/model/search-segment.schema";

import { sealedOf, searchLedger } from "./search-ledger.server";
import type { Segment } from "./search-ledger.server";

const ARCHIVE_AFTER = 2;
const FIRST_SHARD = 0;
const ONE_SHARD = 1;
const DOUBLE = 2;

type Archive = typeof searchArchive.$inferSelect;

const archiveIn = (
  db: DrizzleSqliteDODatabase,
  status: Archive["status"],
): Option.Option<Archive> =>
  Option.fromUndefinedOr(
    db.select().from(searchArchive).where(eq(searchArchive.status, status)).get(),
  );

const liveArchive = (db: DrizzleSqliteDODatabase): Option.Option<Archive> => archiveIn(db, "live");

const buildingArchive = (db: DrizzleSqliteDODatabase): Option.Option<Archive> =>
  archiveIn(db, "building");

const byFromDesc = Order.flip(
  Order.mapInput(Number.Order, ({ fromCreatedAt }: Segment) => fromCreatedAt),
);

const fullPieces = (db: DrizzleSqliteDODatabase): readonly Segment[] =>
  Array.sort(
    sealedOf(searchLedger(db).segments()).filter(({ toCreatedAt }) => toCreatedAt !== null),
    byFromDesc,
  );

const layoutOf = (pieces: readonly Segment[]): readonly ArchivePiece[] => {
  let offset = FIRST_SHARD;
  return pieces.map(({ name, count, shards }) => {
    const placed = { name, offset, count, shards };
    offset += count;
    return placed;
  });
};

const powerOfTwoAtLeast = (wanted: number): number => {
  let shards = ONE_SHARD;
  while (shards < wanted) {
    shards *= DOUBLE;
  }
  return shards;
};

const archivedNames = (db: DrizzleSqliteDODatabase): ReadonlySet<string> =>
  new Set(
    Option.match(liveArchive(db), {
      onNone: () => [],
      onSome: ({ pieces }) => pieces.map(({ name }) => name),
    }),
  );

const shouldStart = (db: DrizzleSqliteDODatabase, pieces: readonly Segment[]): boolean => {
  const archived = archivedNames(db);
  return (
    Option.isNone(buildingArchive(db)) &&
    pieces.filter(({ name }) => !archived.has(name)).length >= ARCHIVE_AFTER
  );
};

const startArchive = (db: DrizzleSqliteDODatabase, now: number): Option.Option<Archive> => {
  const pieces = fullPieces(db);
  if (!shouldStart(db, pieces)) {
    return Option.none();
  }
  const layout = layoutOf(pieces);
  const old = liveArchive(db);
  const wanted = Number.sumAll(layout.map(({ shards }) => shards));
  const row: Archive = {
    name: `archive-${now}`,
    status: "building",
    shards: powerOfTwoAtLeast(wanted),
    count: Number.sumAll(layout.map(({ count }) => count)),
    pieces: layout,
    sources: Option.toArray(old).map(({ name }) => name),
    nextShard: FIRST_SHARD,
  };
  db.insert(searchArchive).values(row).run();
  return Option.some(row);
};

const advanceArchive = (db: DrizzleSqliteDODatabase, name: string, nextShard: number): void => {
  db.update(searchArchive).set({ nextShard }).where(eq(searchArchive.name, name)).run();
};

const finishArchive = (db: DrizzleSqliteDODatabase, name: string): Option.Option<Archive> => {
  const old = liveArchive(db);
  db.delete(searchArchive).where(eq(searchArchive.status, "live")).run();
  db.update(searchArchive)
    .set({ status: "live" })
    .where(and(eq(searchArchive.name, name), eq(searchArchive.status, "building")))
    .run();
  return old;
};

type ArchiveLedger = Readonly<{
  live: () => Option.Option<Archive>;
  building: () => Option.Option<Archive>;
  start: (now: number) => Option.Option<Archive>;
  advance: (name: string, nextShard: number) => void;
  finish: (name: string) => Option.Option<Archive>;
}>;

const archiveLedger = (db: DrizzleSqliteDODatabase): ArchiveLedger => ({
  live: () => liveArchive(db),
  building: () => buildingArchive(db),
  start: (now) => startArchive(db, now),
  advance: (name, nextShard) => {
    advanceArchive(db, name, nextShard);
  },
  finish: (name) => finishArchive(db, name),
});

export { archiveLedger, liveArchive };
export type { Archive, ArchiveLedger };
