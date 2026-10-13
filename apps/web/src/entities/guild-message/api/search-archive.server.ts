import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Effect, Number, Option, Order } from "effect";

import { encodeShard, rangeAt, tokensIn } from "#/entities/guild-message/lib/search-shard";
import type { PostingView, TokenPostings } from "#/entities/guild-message/lib/search-shard";

import { archiveLedger } from "./search-archive-ledger.server";
import type { Archive } from "./search-archive-ledger.server";
import { archiveKey, deleteKeys, shardKey, writeFiles } from "./search-files.server";
import type { StoredFile } from "./search-files.server";

const ARCHIVE_BATCH = 64;
const READ_CONCURRENCY = 4;
const FIRST = 0;
const NEXT = 1;
const DROPPED = -1;

type Merging = Readonly<{
  db: DrizzleSqliteDODatabase;
  bucket: Readonly<R2Bucket>;
  guildId: string;
  now: number;
}>;

type Remap = (ordinal: number) => number;

type Source = Readonly<{ key: string; remap: Remap }>;

type ArchiveStatus = "idle" | "more" | "finished";

type ShardJob = Readonly<{
  merging: Merging;
  target: Archive;
  old: Option.Option<Archive>;
  shard: number;
}>;

const sourcesFor = ({ merging: { guildId }, target, old, shard }: ShardJob): readonly Source[] => {
  const placed = new Map(target.pieces.map((piece) => [piece.name, piece.offset]));
  const fromOld = Option.toArray(old).map((archive): Source => ({
    key: archiveKey({ guildId, archive: archive.name, shard: shard % archive.shards }),
    remap: (ordinal) =>
      Option.getOrElse(
        Option.flatMap(rangeAt({ pieces: archive.pieces, ordinal }), (piece) =>
          Option.map(
            Option.fromUndefinedOr(placed.get(piece.name)),
            (offset) => offset + ordinal - piece.offset,
          ),
        ),
        () => DROPPED,
      ),
  }));
  const inOld = new Set(
    Option.toArray(old).flatMap(({ pieces }) => pieces.map(({ name }) => name)),
  );
  const fromPieces = target.pieces
    .filter(({ name }) => !inOld.has(name))
    .map((piece): Source => ({
      key: shardKey({ guildId, segment: piece.name, shard: shard % piece.shards }),
      remap: (ordinal) => piece.offset + ordinal,
    }));
  return [...fromOld, ...fromPieces];
};

type Pair = Readonly<{ ordinal: number; channel: number }>;

const byOrdinal = Order.mapInput(Number.Order, ({ ordinal }: Pair) => ordinal);

const mergeShard = (
  loaded: readonly Readonly<{ bytes: Option.Option<ArrayBuffer>; remap: Remap }>[],
  { shards, shard }: Readonly<{ shards: number; shard: number }>,
): ArrayBuffer => {
  const collected = new Map<number, Pair[]>();
  const pairsOf = (token: number): Pair[] => collected.get(token) ?? [];
  const addView = (token: number, view: PostingView, remap: Remap): void => {
    const pairs = pairsOf(token);
    for (const [index, ordinal] of view.ordinals.entries()) {
      const mapped = remap(ordinal);
      if (mapped !== DROPPED) {
        pairs.push({ ordinal: mapped, channel: view.channels[index] ?? FIRST });
      }
    }
    collected.set(token, pairs);
  };
  for (const { bytes, remap } of loaded) {
    for (const { token, view } of Option.match(bytes, { onNone: () => [], onSome: tokensIn })) {
      if (token % shards === shard) {
        addView(token, view, remap);
      }
    }
  }
  const entries: TokenPostings[] = Array.fromIterable(collected).map(([token, pairs]) => {
    const sorted = Array.sort(pairs, byOrdinal);
    return {
      token,
      ordinals: sorted.map(({ ordinal }) => ordinal),
      channels: sorted.map(({ channel }) => channel),
    };
  });
  return encodeShard(entries.filter(({ ordinals }) => ordinals.length > FIRST));
};

const readSource = (
  bucket: Readonly<R2Bucket>,
  { key, remap }: Source,
): Effect.Effect<Readonly<{ bytes: Option.Option<ArrayBuffer>; remap: Remap }>> =>
  Effect.promise(() => bucket.get(key)).pipe(
    Effect.flatMap((object) =>
      Option.match(Option.fromNullOr(object), {
        onNone: () => Effect.succeed(Option.none<ArrayBuffer>()),
        onSome: (found) => Effect.promise(() => found.arrayBuffer()).pipe(Effect.asSome),
      }),
    ),
    Effect.map((bytes) => ({ bytes, remap })),
  );

const buildShard = (job: ShardJob): Effect.Effect<StoredFile> =>
  Effect.forEach(sourcesFor(job), (source) => readSource(job.merging.bucket, source), {
    concurrency: READ_CONCURRENCY,
  }).pipe(
    Effect.map((loaded) => ({
      key: archiveKey({ guildId: job.merging.guildId, archive: job.target.name, shard: job.shard }),
      body: mergeShard(loaded, { shards: job.target.shards, shard: job.shard }),
    })),
  );

const oldFiles = ({ guildId }: Merging, archive: Archive): readonly string[] =>
  Array.makeBy(archive.shards, (shard) => archiveKey({ guildId, archive: archive.name, shard }));

const finish = (merging: Merging, target: Archive): Effect.Effect<ArchiveStatus> =>
  Option.match(archiveLedger(merging.db).finish(target.name), {
    onNone: () => Effect.succeed<ArchiveStatus>("finished"),
    onSome: (old) =>
      deleteKeys({ bucket: merging.bucket, keys: oldFiles(merging, old) }).pipe(
        Effect.as<ArchiveStatus>("finished"),
      ),
  });

const continueArchive = (merging: Merging, target: Archive): Effect.Effect<ArchiveStatus> => {
  const upTo = Math.min(target.nextShard + ARCHIVE_BATCH, target.shards);
  const old = archiveLedger(merging.db).live();
  return Effect.forEach(
    Array.range(target.nextShard, upTo - NEXT),
    (shard) => buildShard({ merging, target, old, shard }),
    {
      concurrency: READ_CONCURRENCY,
    },
  ).pipe(
    Effect.flatMap((files) => writeFiles({ bucket: merging.bucket, files })),
    Effect.flatMap(() => {
      archiveLedger(merging.db).advance(target.name, upTo);
      if (upTo < target.shards) {
        return Effect.succeed<ArchiveStatus>("more");
      }
      return finish(merging, target);
    }),
    Effect.withSpan("search.archive", {
      attributes: { guildId: merging.guildId, from: target.nextShard, upTo, shards: target.shards },
    }),
  );
};

const archiveStep = (merging: Merging): Effect.Effect<ArchiveStatus> => {
  const ledger = archiveLedger(merging.db);
  const target = Option.orElse(ledger.building(), () => ledger.start(merging.now));
  return Option.match(target, {
    onNone: () => Effect.succeed<ArchiveStatus>("idle"),
    onSome: (found) => continueArchive(merging, found),
  });
};

export { archiveStep };
export type { ArchiveStatus, Merging };
