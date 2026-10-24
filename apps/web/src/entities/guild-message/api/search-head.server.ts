import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Effect, Option, pipe, Record } from "effect";

import { searchInvalid } from "#/entities/guild-message/model/search-segment.schema";

import { liveArchive } from "./search-archive-ledger.server";
import { searchChannels } from "./search-channels.server";
import { vectorsOfRow, writeHead } from "./search-files.server";
import type { ArchiveEntry, SearchHead, SegmentEntry } from "./search-files.server";
import { searchLedger } from "./search-ledger.server";
import type { Segment } from "./search-ledger.server";
import { centroidStamp } from "./vector-centroids.server";

const entryOf = (segment: Segment, isArchived: (name: string) => boolean): SegmentEntry => ({
  name: segment.name,
  kind: segment.kind,
  from: segment.fromCreatedAt,
  archived: isArchived(segment.name),
  count: segment.count,
  shards: segment.shards,
  ...Option.match(vectorsOfRow(segment), {
    onNone: () => ({}),
    onSome: (vectors) => ({ vectors }),
  }),
});

type InvalidRow = Readonly<{ segment: string; ordinal: number }>;

const ordinalsBySegment = (rows: readonly InvalidRow[]): SearchHead["invalid"] => {
  const grouped = new Map<string, number[]>();
  for (const { segment, ordinal } of rows) {
    grouped.set(segment, [...(grouped.get(segment) ?? []), ordinal]);
  }
  return Record.fromEntries(grouped);
};

const archiveOf = (
  db: DrizzleSqliteDODatabase,
  isLive: (name: string) => boolean,
): Option.Option<ArchiveEntry> =>
  Option.map(liveArchive(db), (archive) => ({
    name: archive.name,
    shards: archive.shards,
    pieces: pipe(
      archive.pieces,
      Array.filter(({ name }) => isLive(name)),
      Array.map(({ name, offset }) => ({ name, offset })),
    ),
  }));

const headOf = (db: DrizzleSqliteDODatabase): SearchHead => {
  const segments = searchLedger(db).segments();
  const live = new Set(
    pipe(
      segments,
      Array.map(({ name }) => name),
    ),
  );
  const archive = archiveOf(db, (name) => live.has(name));
  const archived = new Set(
    Option.match(archive, {
      onNone: () => [],
      onSome: ({ pieces }) =>
        pipe(
          pieces,
          Array.map(({ name }) => name),
        ),
    }),
  );
  return {
    segments: pipe(
      segments,
      Array.map((segment) => entryOf(segment, (name) => archived.has(name))),
    ),
    channels: searchChannels(db).list(),
    invalid: ordinalsBySegment(db.select().from(searchInvalid).all()),
    ...Option.match(archive, { onNone: () => ({}), onSome: (found) => ({ archive: found }) }),
    ...Option.match(centroidStamp(db), {
      onNone: () => ({}),
      onSome: (centroids) => ({ centroids }),
    }),
  };
};

type HeadTarget = Readonly<{
  db: DrizzleSqliteDODatabase;
  bucket: Readonly<R2Bucket>;
  guildId: string;
}>;

const writeSearchHead = ({ db, bucket, guildId }: HeadTarget): Effect.Effect<void> =>
  Effect.suspend(() => writeHead({ bucket, guildId, head: headOf(db) }));

const deletedEntry = (segment: Segment): SegmentEntry => entryOf(segment, () => false);

export { deletedEntry, writeSearchHead };
export type { HeadTarget };
