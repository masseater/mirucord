import { Array, Clock, Data, Effect, Number, Option, Record } from "effect";

import {
  decodeMeta,
  matchSegment,
  newestFirst,
  postingsOf,
  readChunk,
} from "#/entities/guild-message/lib/search-query";
import type { Hit, SegmentHits } from "#/entities/guild-message/lib/search-query";
import { CHUNK_SIZE, chunkOf, shardOf } from "#/entities/guild-message/lib/search-segment";
import type { SealedEntry } from "#/entities/guild-message/lib/search-segment";

import { cachedBytes, chunkKey, metaKey, readHead, shardKey } from "./search-files.server";
import type { FileRead, SearchHead, SegmentEntry } from "./search-files.server";

const NONE = 0;

type SearchRequest = Readonly<{
  guildId: string;
  tokens: readonly number[];
  channelIds: readonly string[];
  offset: number;
  limit: number;
}>;

type SearchStats = Readonly<{
  segments: number;
  filesRead: number;
  filesCached: number;
  bytesRead: number;
  headMs: number;
  indexMs: number;
  bodyMs: number;
}>;

type SearchResult = Readonly<{
  total: number;
  entries: readonly SealedEntry[];
  stats: SearchStats;
}>;

class MissingFile extends Data.TaggedError("MissingFile")<Readonly<{ key: string }>> {}

const required = (read: FileRead): Effect.Effect<ArrayBuffer, MissingFile> =>
  Effect.fromOption(read.bytes).pipe(Effect.mapError(() => new MissingFile({ key: read.key })));

type SegmentScan = Readonly<{ hits: SegmentHits; reads: readonly FileRead[] }>;

type ScanTarget = Readonly<{ request: SearchRequest; head: SearchHead; segment: SegmentEntry }>;

type ShardRead = Readonly<{ shard: number; read: FileRead }>;

const readShards = ({ request, segment }: ScanTarget): Effect.Effect<readonly ShardRead[]> =>
  Effect.forEach(
    Array.dedupe(request.tokens.map((token) => shardOf({ token, shards: segment.shards }))),
    (shard) =>
      cachedBytes(shardKey({ guildId: request.guildId, segment: segment.name, shard })).pipe(
        Effect.map((read) => ({ shard, read })),
      ),
    { concurrency: "unbounded" },
  );

const postingsFor = (
  target: ScanTarget,
  shardReads: readonly ShardRead[],
): Effect.Effect<readonly (readonly number[])[], MissingFile> =>
  Effect.forEach(
    shardReads,
    ({ shard, read }) => required(read).pipe(Effect.map((bytes) => [shard, bytes] as const)),
    { concurrency: "unbounded" },
  ).pipe(
    Effect.map((loaded) => {
      const byShard = new Map(loaded);
      return target.request.tokens.map((token) => {
        const shard = byShard.get(shardOf({ token, shards: target.segment.shards }));
        return Option.match(Option.fromUndefinedOr(shard), {
          onNone: () => [],
          onSome: (bytes) => postingsOf({ shard: bytes, token }),
        });
      });
    }),
  );

const scanSegment = (target: ScanTarget): Effect.Effect<SegmentScan, MissingFile> => {
  const { request, head, segment } = target;
  return Effect.all(
    {
      meta: cachedBytes(metaKey({ guildId: request.guildId, segment: segment.name })),
      shards: readShards(target),
    },
    { concurrency: "unbounded" },
  ).pipe(
    Effect.flatMap(({ meta, shards }) =>
      Effect.all({
        decoded: required(meta).pipe(Effect.flatMap(decodeMeta)),
        postings: postingsFor(target, shards),
      }).pipe(
        Effect.map(({ decoded, postings }) => ({
          hits: {
            segment: segment.name,
            createdAt: decoded.createdAt,
            ordinals: matchSegment({
              meta: decoded,
              postings,
              invalid: Option.getOrElse(Record.get(head.invalid, segment.name), () => []),
              channelIds: request.channelIds,
            }),
          },
          reads: [meta, ...shards.map(({ read }) => read)],
        })),
      ),
    ),
  );
};

const textDecoder = new TextDecoder();

type ChunkRef = Readonly<{ segment: string; chunk: number }>;

const chunkId = ({ segment, chunk }: ChunkRef): string => `${segment}/${chunk}`;

type LoadedChunk = Readonly<{ id: string; entries: readonly SealedEntry[]; read: FileRead }>;

const loadChunk = (guildId: string, ref: ChunkRef): Effect.Effect<LoadedChunk, MissingFile> =>
  cachedBytes(chunkKey({ guildId, ...ref })).pipe(
    Effect.flatMap((read) =>
      required(read).pipe(
        Effect.flatMap((bytes) => readChunk(textDecoder.decode(bytes))),
        Effect.map((entries) => ({ id: chunkId(ref), entries, read })),
      ),
    ),
  );

type LoadedPage = Readonly<{ entries: readonly SealedEntry[]; reads: readonly FileRead[] }>;

const entryAt = (
  chunks: readonly LoadedChunk[],
  { segment, ordinal }: Hit,
): Option.Option<SealedEntry> => {
  const id = chunkId({ segment, chunk: chunkOf(ordinal) });
  return Option.fromUndefinedOr(chunks.find((chunk) => chunk.id === id)).pipe(
    Option.flatMap(({ entries }) => Option.fromUndefinedOr(entries[ordinal % CHUNK_SIZE])),
  );
};

const loadPage = (guildId: string, page: readonly Hit[]): Effect.Effect<LoadedPage, MissingFile> =>
  Effect.forEach(
    Array.dedupeWith(
      page.map(({ segment, ordinal }) => ({ segment, chunk: chunkOf(ordinal) })),
      (left, right) => chunkId(left) === chunkId(right),
    ),
    (ref) => loadChunk(guildId, ref),
    { concurrency: "unbounded" },
  ).pipe(
    Effect.map((chunks) => ({
      entries: page.flatMap((hit) => Option.toArray(entryAt(chunks, hit))),
      reads: chunks.map(({ read }) => read),
    })),
  );

const timed = <Value, Failure>(
  effect: Effect.Effect<Value, Failure>,
): Effect.Effect<readonly [Value, number], Failure> =>
  Effect.all([Clock.currentTimeMillis, effect, Clock.currentTimeMillis]).pipe(
    Effect.map(([started, value, finished]) => [value, finished - started] as const),
  );

const tallyOf = (
  reads: readonly FileRead[],
): Pick<SearchStats, "filesRead" | "filesCached" | "bytesRead"> => ({
  filesRead: reads.length,
  filesCached: reads.filter(({ cached }) => cached).length,
  bytesRead: Number.sumAll(
    reads.map(({ bytes }) =>
      Option.match(bytes, { onNone: () => NONE, onSome: (found) => found.byteLength }),
    ),
  ),
});

type Scanned = Readonly<{
  head: SearchHead;
  headMs: number;
  scans: readonly SegmentScan[];
  indexMs: number;
}>;

const scanAll = (request: SearchRequest): Effect.Effect<Scanned, MissingFile> =>
  timed(readHead(request.guildId)).pipe(
    Effect.flatMap(([head, headMs]) =>
      timed(
        Effect.forEach(head.segments, (segment) => scanSegment({ request, head, segment }), {
          concurrency: "unbounded",
        }),
      ).pipe(Effect.map(([scans, indexMs]) => ({ head, headMs, scans, indexMs }))),
    ),
  );

const searchOnce = (request: SearchRequest): Effect.Effect<SearchResult, MissingFile> =>
  scanAll(request).pipe(
    Effect.flatMap(({ head, headMs, scans, indexMs }) => {
      const segments = scans.map(({ hits }) => hits);
      const page = newestFirst({ segments, take: request.offset + request.limit }).slice(
        request.offset,
      );
      return timed(loadPage(request.guildId, page)).pipe(
        Effect.map(([loaded, bodyMs]) => ({
          total: Number.sumAll(segments.map(({ ordinals }) => ordinals.length)),
          entries: loaded.entries,
          stats: {
            segments: head.segments.length,
            ...tallyOf([...scans.flatMap(({ reads }) => reads), ...loaded.reads]),
            headMs,
            indexMs,
            bodyMs,
          },
        })),
      );
    }),
  );

const NO_STATS: SearchStats = {
  segments: NONE,
  filesRead: NONE,
  filesCached: NONE,
  bytesRead: NONE,
  headMs: NONE,
  indexMs: NONE,
  bodyMs: NONE,
};

const searchMessages = (request: SearchRequest): Effect.Effect<SearchResult> =>
  searchOnce(request).pipe(
    Effect.catchTag("MissingFile", () => searchOnce(request)),
    Effect.catchTag("MissingFile", ({ key }) =>
      Effect.logError("Search file is missing").pipe(
        Effect.annotateLogs({ key }),
        Effect.as({ total: NONE, entries: [], stats: NO_STATS }),
      ),
    ),
    Effect.tap(({ total, stats }) =>
      Effect.logInfo("Search finished").pipe(
        Effect.annotateLogs({
          guildId: request.guildId,
          tokens: request.tokens.length,
          total,
          ...stats,
        }),
      ),
    ),
    Effect.withSpan("search.messages", { attributes: { guildId: request.guildId } }),
  );

export { searchMessages };
export type { SearchRequest, SearchResult, SearchStats };
