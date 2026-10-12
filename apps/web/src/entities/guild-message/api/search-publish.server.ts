import { eq, inArray } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Effect, Option } from "effect";

import { SEQUENTIAL } from "#/entities/guild-message/lib/search-layout";
import { buildIndex, CHUNK_SIZE, encodeChunk } from "#/entities/guild-message/lib/search-segment";
import { searchInvalid, searchSegment } from "#/entities/guild-message/model/search-segment.schema";

import {
  chunkKey,
  deleteSegments,
  metaKey,
  shardKey,
  writeFiles,
  writeHead,
} from "./search-files.server";
import type { SearchHead, SegmentEntry, StoredFile } from "./search-files.server";
import { EARLIEST, recentOf, sealedOf, segmentNames, searchLedger } from "./search-ledger.server";
import type { Range, Segment } from "./search-ledger.server";
import { PURGE_AFTER_MS, searchPlanner } from "./search-plan.server";
import type { PieceRow, PieceSpec, Plan } from "./search-plan.server";
import { searchRows } from "./search-rows.server";

type Publisher = Readonly<{
  db: DrizzleSqliteDODatabase;
  bucket: Readonly<R2Bucket>;
  guildId: string;
  now: number;
}>;

type BuiltPiece = Readonly<{
  entry: SegmentEntry;
  ids: readonly string[];
  range: Range;
  files: readonly StoredFile[];
}>;

const pieceName = ({ now }: Publisher, kind: Segment["kind"], range: Range): string =>
  `${kind}-${range.from}-${now}`;

const filesOf = (
  publisher: Publisher,
  name: string,
  built: Readonly<{
    meta: Readonly<ArrayBuffer>;
    shards: readonly Readonly<ArrayBuffer>[];
    chunks: readonly string[];
  }>,
): readonly StoredFile[] => {
  const segment = { guildId: publisher.guildId, segment: name };
  return [
    { key: metaKey(segment), body: built.meta },
    ...built.shards.map((body, shard) => ({ key: shardKey({ ...segment, shard }), body })),
    ...built.chunks.map((body, chunk) => ({ key: chunkKey({ ...segment, chunk }), body })),
  ];
};

const buildPiece = (
  publisher: Publisher,
  kind: Segment["kind"],
  { range, rows }: PieceSpec,
): Effect.Effect<BuiltPiece> => {
  const name = pieceName(publisher, kind, range);
  const ids = rows.map(({ id }) => id);
  return Effect.all({
    index: buildIndex(rows),
    chunks: Effect.forEach(
      Array.chunksOf(ids, CHUNK_SIZE),
      (chunk) => encodeChunk(searchRows(publisher.db).entries(chunk)),
      { concurrency: SEQUENTIAL },
    ),
  }).pipe(
    Effect.map(({ index, chunks }) => ({
      entry: { name, count: index.count, shards: index.shards.length },
      ids,
      range,
      files: filesOf(publisher, name, { meta: index.meta, shards: index.shards, chunks }),
    })),
  );
};

type Recorded = Readonly<{ kind: Segment["kind"]; pieces: readonly BuiltPiece[]; built: number }>;

const recordPieces = ({ db, now }: Publisher, { kind, pieces, built }: Recorded): void => {
  for (const { entry, ids, range } of pieces) {
    db.insert(searchSegment)
      .values({
        name: entry.name,
        kind,
        fromCreatedAt: range.from,
        toCreatedAt: Option.getOrNull(range.to),
        builtThrough: built,
        count: entry.count,
        shards: entry.shards,
        ids: [...ids],
      })
      .run();
    searchLedger(db).invalidate(
      searchRows(db)
        .changedSince(ids, built)
        .map((ordinal) => ({ segment: entry.name, ordinal })),
      now,
    );
  }
};

const dropSegments = (db: DrizzleSqliteDODatabase, segments: readonly Segment[]): void => {
  const names = segmentNames(segments);
  if (Array.isReadonlyArrayNonEmpty(names)) {
    db.delete(searchSegment)
      .where(inArray(searchSegment.name, [...names]))
      .run();
    db.delete(searchInvalid)
      .where(inArray(searchInvalid.segment, [...names]))
      .run();
  }
};

type Replacement = Readonly<{
  kind: Segment["kind"];
  replaced: readonly Segment[];
  pieces: readonly PieceSpec[];
}>;

const replaceSegments = (
  publisher: Publisher,
  { kind, replaced, pieces }: Replacement,
): Effect.Effect<readonly Segment[]> => {
  const built = searchLedger(publisher.db).latestVersion();
  return Effect.forEach(pieces, (piece) => buildPiece(publisher, kind, piece), {
    concurrency: SEQUENTIAL,
  }).pipe(
    Effect.tap((placed) =>
      writeFiles({ bucket: publisher.bucket, files: placed.flatMap(({ files }) => files) }),
    ),
    Effect.map((placed) => {
      dropSegments(publisher.db, replaced);
      recordPieces(publisher, { kind, pieces: placed, built });
      return replaced;
    }),
  );
};

const rebuildSealed = (publisher: Publisher, plan: Plan): Effect.Effect<readonly Segment[]> => {
  if (plan.status === "recentOnly") {
    return Effect.succeed([]);
  }
  return replaceSegments(publisher, {
    kind: "sealed",
    replaced: plan.replaced,
    pieces: plan.pieces,
  });
};

const hasInvalid = (db: DrizzleSqliteDODatabase, segment: Segment): boolean => {
  const found = db
    .select({ segment: searchInvalid.segment })
    .from(searchInvalid)
    .where(eq(searchInvalid.segment, segment.name))
    .get();
  return Option.isSome(Option.fromUndefinedOr(found));
};

const recentIsStale = (
  publisher: Publisher,
  recent: Option.Option<Segment>,
  sealedChanged: boolean,
): boolean => {
  const newest = searchLedger(publisher.db).latestPending(
    sealedOf(searchLedger(publisher.db).segments()),
  );
  return (
    sealedChanged ||
    Option.match(recent, {
      onNone: () => newest > EARLIEST,
      onSome: (segment) => newest > segment.builtThrough || hasInvalid(publisher.db, segment),
    })
  );
};

type RecentRebuild = Readonly<{ replaced: readonly Segment[]; rows: readonly PieceRow[] }>;

const replaceRecent = (
  publisher: Publisher,
  { replaced, rows }: RecentRebuild,
): Effect.Effect<readonly Segment[]> => {
  if (Array.isReadonlyArrayEmpty(rows)) {
    dropSegments(publisher.db, replaced);
    return Effect.succeed(replaced);
  }
  const pieces = [{ range: { from: EARLIEST, to: Option.none<number>() }, rows }];
  return replaceSegments(publisher, { kind: "recent", replaced, pieces });
};

const rebuildRecent = (
  publisher: Publisher,
  sealedChanged: boolean,
): Effect.Effect<readonly Segment[]> => {
  const segments = searchLedger(publisher.db).segments();
  const recent = recentOf(segments);
  if (!recentIsStale(publisher, recent, sealedChanged)) {
    return Effect.succeed([]);
  }
  return replaceRecent(publisher, {
    replaced: Option.toArray(recent),
    rows: searchPlanner(publisher.db).recentRows(sealedOf(segments)),
  });
};

const entryOf = ({ name, count, shards }: Segment): SegmentEntry => ({ name, count, shards });

type InvalidRow = Readonly<{ segment: string; ordinal: number }>;

const ordinalsBySegment = (rows: readonly InvalidRow[]): SearchHead["invalid"] => {
  const grouped = new Map<string, number[]>();
  for (const { segment, ordinal } of rows) {
    grouped.set(segment, [...(grouped.get(segment) ?? []), ordinal]);
  }
  return Object.fromEntries(grouped);
};

const headOf = (db: DrizzleSqliteDODatabase): SearchHead => ({
  segments: searchLedger(db)
    .segments()
    .map((segment) => entryOf(segment)),
  invalid: ordinalsBySegment(db.select().from(searchInvalid).all()),
});

const nextRun = ({ db, now }: Publisher): Option.Option<number> => {
  if (searchPlanner(db).plan(now).status === "rebuild") {
    return Option.some(now);
  }
  const sealed = segmentNames(sealedOf(searchLedger(db).segments()));
  return Option.map(searchLedger(db).oldestInvalid(sealed), (since) => since + PURGE_AFTER_MS);
};

type HeadTarget = Omit<Publisher, "now">;

const writeSearchHead = ({ db, bucket, guildId }: HeadTarget): Effect.Effect<void> =>
  Effect.suspend(() => writeHead({ bucket, guildId, head: headOf(db) }));

const publishSearch = (publisher: Publisher): Effect.Effect<Option.Option<number>> => {
  const { db, bucket, guildId, now } = publisher;
  const plan = searchPlanner(db).plan(now);
  return rebuildSealed(publisher, plan).pipe(
    Effect.flatMap((sealed) =>
      rebuildRecent(publisher, plan.status === "rebuild").pipe(
        Effect.map((recent) => [...sealed, ...recent]),
      ),
    ),
    Effect.tap(() => writeSearchHead(publisher)),
    Effect.tap((replaced) =>
      deleteSegments({ bucket, guildId, segments: replaced.map((segment) => entryOf(segment)) }),
    ),
    Effect.map(() => nextRun(publisher)),
    Effect.withSpan("search.publish", { attributes: { guildId, plan: plan.status } }),
  );
};

export { publishSearch, writeSearchHead };
export type { HeadTarget, Publisher };
