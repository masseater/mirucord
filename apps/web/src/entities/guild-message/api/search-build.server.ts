import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Effect, Option } from "effect";

import {
  buildIndex,
  CHUNK_SIZE,
  encodeChunk,
  encodeRecent,
} from "#/entities/guild-message/lib/search-segment";
import type { IndexRow } from "#/entities/guild-message/lib/search-segment";
import { searchSegment } from "#/entities/guild-message/model/search-segment.schema";

import { searchChannels } from "./search-channels.server";
import { chunkKey, recentKey, shardKey } from "./search-files.server";
import type { StoredFile } from "./search-files.server";
import { searchLedger } from "./search-ledger.server";
import type { Range, Segment } from "./search-ledger.server";
import type { PieceRow, PieceSpec } from "./search-plan.server";
import type { Flush } from "./search-recent.server";
import { searchRows } from "./search-rows.server";

const NO_CHANNEL = 0;

type Publisher = Readonly<{
  db: DrizzleSqliteDODatabase;
  bucket: Readonly<R2Bucket>;
  guildId: string;
  now: number;
  flush: Flush;
}>;

type BuiltPiece = Readonly<{
  entry: Readonly<{ name: string; count: number; shards: number }>;
  ids: readonly string[];
  range: Range;
  files: readonly StoredFile[];
}>;

const pieceName = ({ now }: Publisher, kind: Segment["kind"], range: Range): string =>
  `${kind}-${range.from}-${now}`;

type BuiltFiles = Readonly<{
  index: readonly Readonly<ArrayBuffer>[];
  chunks: readonly string[];
}>;

const filesOf = (
  publisher: Publisher,
  { name, kind }: Readonly<{ name: string; kind: Segment["kind"] }>,
  built: BuiltFiles,
): readonly StoredFile[] => {
  const segment = { guildId: publisher.guildId, segment: name };
  const keyOf: Record<Segment["kind"], (shard: number) => string> = {
    recent: () => recentKey(segment),
    sealed: (shard) => shardKey({ ...segment, shard }),
  };
  const index = built.index.map((body, shard) => ({ key: keyOf[kind](shard), body }));
  return [
    ...index,
    ...built.chunks.map((body, chunk) => ({ key: chunkKey({ ...segment, chunk }), body })),
  ];
};

const indexRowsOf = (
  db: DrizzleSqliteDODatabase,
  rows: readonly PieceRow[],
): readonly IndexRow[] => {
  const positions = searchChannels(db).positions(rows.map(({ channelId }) => channelId));
  return rows.map(({ channelId, createdAt, tokens }) => ({
    channel: positions.get(channelId) ?? NO_CHANNEL,
    createdAt,
    tokens,
  }));
};

const indexFiles = (
  kind: Segment["kind"],
  rows: readonly IndexRow[],
): readonly Readonly<ArrayBuffer>[] => {
  if (kind === "recent") {
    return [encodeRecent(rows)];
  }
  return buildIndex(rows).shards;
};

type PieceBuild = Readonly<{ publisher: Publisher; kind: Segment["kind"]; piece: PieceSpec }>;

const buildPiece = ({
  publisher,
  kind,
  piece: { range, rows },
}: PieceBuild): Effect.Effect<BuiltPiece> => {
  const name = pieceName(publisher, kind, range);
  const ids = rows.map(({ id }) => id);
  const index = indexFiles(kind, indexRowsOf(publisher.db, rows));
  return Effect.forEach(Array.chunksOf(ids, CHUNK_SIZE), (chunk) =>
    encodeChunk(searchRows(publisher.db).entries(chunk)),
  ).pipe(
    Effect.map((chunks) => ({
      entry: { name, count: rows.length, shards: index.length },
      ids,
      range,
      files: filesOf(publisher, { name, kind }, { index, chunks }),
    })),
  );
};

type Recorded = Readonly<{
  publisher: Publisher;
  kind: Segment["kind"];
  pieces: readonly BuiltPiece[];
  built: number;
}>;

const recordPieces = ({ publisher: { db, now }, kind, pieces, built }: Recorded): void => {
  for (const { entry, ids, range } of pieces) {
    db.insert(searchSegment)
      .values({
        name: entry.name,
        kind,
        fromCreatedAt: range.from,
        toCreatedAt: Option.getOrNull(range.to),
        builtThrough: built,
        builtAt: now,
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

export { buildPiece, recordPieces };
export type { BuiltPiece, PieceBuild, Publisher, Recorded };
