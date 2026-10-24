import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Boolean, Effect, Number, Option, Order, pipe } from "effect";

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
  mayStart: boolean;
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

type Feeding = Readonly<{ from: number; shard: number; shards: number }>;

const shardsFeeding = ({ from, shard, shards }: Feeding): readonly number[] =>
  Array.makeBy(Math.max(from / shards, NEXT), (index) => (shard % from) + index * shards);

const oldArchiveSources = ({
  merging: { guildId },
  target,
  old,
  shard,
}: ShardJob): readonly Source[] => {
  const placed = new Map(
    pipe(
      target.pieces,
      Array.map((piece) => [piece.name, piece.offset]),
    ),
  );
  return pipe(
    Option.toArray(old),
    Array.flatMap((archive) => {
      const remap: Remap = (ordinal) =>
        Option.getOrElse(
          Option.flatMap(rangeAt({ pieces: archive.pieces, ordinal }), (piece) =>
            Option.map(
              Option.fromUndefinedOr(placed.get(piece.name)),
              (offset) => offset + ordinal - piece.offset,
            ),
          ),
          () => DROPPED,
        );
      return pipe(
        shardsFeeding({ from: archive.shards, shard, shards: target.shards }),
        Array.map((feeding): Source => ({
          key: archiveKey({ guildId, archive: archive.name, shard: feeding }),
          remap,
        })),
      );
    }),
  );
};

const sourcesFor = (job: ShardJob): readonly Source[] => {
  const {
    merging: { guildId },
    target,
    old,
    shard,
  } = job;
  const inOld = new Set(
    pipe(
      Option.toArray(old),
      Array.flatMap(({ pieces }) =>
        pipe(
          pieces,
          Array.map(({ name }) => name),
        ),
      ),
    ),
  );
  const fromPieces = pipe(
    target.pieces,
    Array.filter(({ name }) => !inOld.has(name)),
    Array.flatMap((piece) =>
      pipe(
        shardsFeeding({ from: piece.shards, shard, shards: target.shards }),
        Array.map((feeding): Source => ({
          key: shardKey({ guildId, segment: piece.name, shard: feeding }),
          remap: (ordinal) => piece.offset + ordinal,
        })),
      ),
    ),
  );
  return [...oldArchiveSources(job), ...fromPieces];
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
  const entries: TokenPostings[] = pipe(
    Array.fromIterable(collected),
    Array.map(([token, pairs]) => {
      const sorted = Array.sort(pairs, byOrdinal);
      return {
        token,
        ordinals: pipe(
          sorted,
          Array.map(({ ordinal }) => ordinal),
        ),
        channels: pipe(
          sorted,
          Array.map(({ channel }) => channel),
        ),
      };
    }),
  );
  return encodeShard(
    pipe(
      entries,
      Array.filter(({ ordinals }) => ordinals.length > FIRST),
    ),
  );
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
  const target = Option.orElse(ledger.building(), () =>
    Boolean.match(merging.mayStart, {
      onTrue: () => ledger.start(merging.now),
      onFalse: () => Option.none(),
    }),
  );
  return Option.match(target, {
    onNone: () => Effect.succeed<ArchiveStatus>("idle"),
    onSome: (found) => continueArchive(merging, found),
  });
};

export { archiveStep };
export type { ArchiveStatus, Merging };
