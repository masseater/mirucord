import { Array, Clock, Effect, Number, Option, Record } from "effect";

import {
  decodeRecent,
  matchPostings,
  orderedHits,
} from "#/entities/guild-message/lib/search-query";
import type { Filter, RecentHits, SealedHits } from "#/entities/guild-message/lib/search-query";
import type { SealedEntry } from "#/entities/guild-message/lib/search-segment";
import { postingsIn, shardOf } from "#/entities/guild-message/lib/search-shard";
import type { PostingView } from "#/entities/guild-message/lib/search-shard";

import { archivedHits } from "./search-archive-hits.server";
import { cachedBytes } from "./search-cache.server";
import type { FileRead } from "./search-cache.server";
import { archiveKey, readHead, recentKey, shardKey } from "./search-files.server";
import type { SearchHead, SegmentEntry } from "./search-files.server";
import { loadPage, required } from "./search-page.server";
import type { MissingFile } from "./search-page.server";

const NONE = 0;
const ONE_SHARD = 1;

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

type Scope = Readonly<{
  request: SearchRequest;
  head: SearchHead;
  allowed: Option.Option<ReadonlySet<number>>;
}>;

type Scanned<Hits> = Readonly<{ hits: Hits; reads: readonly FileRead[] }>;

const invalidOf = (head: SearchHead, segment: string): ReadonlySet<number> =>
  new Set(Option.getOrElse(Record.get(head.invalid, segment), () => []));

type ShardSet = Readonly<{ count: number; shardAt: (shard: number) => Option.Option<ArrayBuffer> }>;

const allViews = (
  set: ShardSet,
  tokens: readonly number[],
): Option.Option<readonly PostingView[]> => {
  const viewOf = (token: number): Option.Option<PostingView> =>
    Option.flatMap(set.shardAt(shardOf({ token, shards: set.count })), (shard) =>
      postingsIn({ shard, token }),
    );
  return Option.all(tokens.map((token) => viewOf(token)));
};

const readShardSet = (
  tokens: readonly number[],
  shardCount: number,
  keyOf: (shard: number) => string,
): Effect.Effect<Readonly<{ set: ShardSet; reads: readonly FileRead[] }>, MissingFile> =>
  Effect.forEach(
    Array.dedupe(tokens.map((token) => shardOf({ token, shards: shardCount }))),
    (shard) =>
      cachedBytes(keyOf(shard)).pipe(
        Effect.flatMap((read) =>
          required(read).pipe(Effect.map((bytes) => ({ shard, bytes, read }))),
        ),
      ),
    { concurrency: "unbounded" },
  ).pipe(
    Effect.map((loaded) => {
      const shards = new Map(loaded.map(({ shard, bytes }) => [shard, bytes]));
      return {
        set: { count: shardCount, shardAt: (shard) => Option.fromUndefinedOr(shards.get(shard)) },
        reads: loaded.map(({ read }) => read),
      };
    }),
  );

const matched = (views: Option.Option<readonly PostingView[]>, filter: Filter): readonly number[] =>
  Option.match(views, {
    onNone: () => [],
    onSome: (found) => matchPostings({ views: found, filter }),
  });

const scanPiece = (
  { request, head, allowed }: Scope,
  segment: SegmentEntry,
): Effect.Effect<Scanned<SealedHits>, MissingFile> => {
  const invalid = invalidOf(head, segment.name);
  return readShardSet(request.tokens, segment.shards, (shard) =>
    shardKey({ guildId: request.guildId, segment: segment.name, shard }),
  ).pipe(
    Effect.map(({ set, reads }) => ({
      hits: {
        segment: segment.name,
        from: segment.from,
        ordinals: matched(allViews(set, request.tokens), {
          allowed,
          skipped: (ordinal) => invalid.has(ordinal),
        }),
      },
      reads,
    })),
  );
};

const scanRecent = (
  { request, head, allowed }: Scope,
  segment: SegmentEntry,
): Effect.Effect<Scanned<RecentHits>, MissingFile> => {
  const invalid = invalidOf(head, segment.name);
  return cachedBytes(recentKey({ guildId: request.guildId, segment: segment.name })).pipe(
    Effect.flatMap((read) =>
      required(read).pipe(Effect.map((bytes) => ({ read, file: decodeRecent(bytes) }))),
    ),
    Effect.map(({ read, file }) => ({
      hits: {
        segment: segment.name,
        createdAt: file.createdAt,
        ordinals: matched(
          allViews({ count: ONE_SHARD, shardAt: () => Option.some(file.index) }, request.tokens),
          {
            allowed,
            skipped: (ordinal) => invalid.has(ordinal),
          },
        ),
      },
      reads: [read],
    })),
  );
};

const scanArchive = (scope: Scope): Effect.Effect<Scanned<readonly SealedHits[]>, MissingFile> =>
  Option.match(Option.fromUndefinedOr(scope.head.archive), {
    onNone: () => Effect.succeed({ hits: [], reads: [] }),
    onSome: (archive) =>
      readShardSet(scope.request.tokens, archive.shards, (shard) =>
        archiveKey({ guildId: scope.request.guildId, archive: archive.name, shard }),
      ).pipe(
        Effect.map(({ set, reads }) => ({
          hits: archivedHits({
            head: scope.head,
            archive,
            allowed: scope.allowed,
            views: allViews(set, scope.request.tokens),
          }),
          reads,
        })),
      ),
  });

const allowedOf = (
  head: SearchHead,
  channelIds: readonly string[],
): Option.Option<ReadonlySet<number>> => {
  const wanted = new Set(channelIds);
  const positions = head.channels.flatMap((id, position) =>
    Array.filter([position], () => wanted.has(id)),
  );
  return Option.liftPredicate(new Set(positions), (set) => set.size < head.channels.length);
};

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

type Gathered = Readonly<{
  recent: Option.Option<RecentHits>;
  sealed: readonly SealedHits[];
  reads: readonly FileRead[];
}>;

const gather = (scope: Scope): Effect.Effect<Gathered, MissingFile> => {
  const recent = scope.head.segments.filter(({ kind }) => kind === "recent");
  const pieces = scope.head.segments.filter(({ kind, archived }) => kind === "sealed" && !archived);
  return Effect.all(
    {
      recent: Effect.forEach(recent, (segment) => scanRecent(scope, segment), {
        concurrency: "unbounded",
      }),
      pieces: Effect.forEach(pieces, (segment) => scanPiece(scope, segment), {
        concurrency: "unbounded",
      }),
      archive: scanArchive(scope),
    },
    { concurrency: "unbounded" },
  ).pipe(
    Effect.map(({ recent: recentScans, pieces: pieceScans, archive }) => ({
      recent: Array.head(recentScans.map(({ hits }) => hits)),
      sealed: [...pieceScans.map(({ hits }) => hits), ...archive.hits],
      reads: [...recentScans, ...pieceScans, archive].flatMap(({ reads }) => reads),
    })),
  );
};

const totalOf = ({ recent, sealed }: Gathered): number =>
  Number.sumAll([
    ...Option.toArray(recent).map(({ ordinals }) => ordinals.length),
    ...sealed.map(({ ordinals }) => ordinals.length),
  ]);

const searchOnce = (request: SearchRequest): Effect.Effect<SearchResult, MissingFile> =>
  timed(readHead(request.guildId)).pipe(
    Effect.flatMap(([head, headMs]) =>
      timed(gather({ request, head, allowed: allowedOf(head, request.channelIds) })).pipe(
        Effect.flatMap(([gathered, indexMs]) => {
          const page = orderedHits({ ...gathered, offset: request.offset, limit: request.limit });
          return timed(loadPage({ guildId: request.guildId, page })).pipe(
            Effect.map(([loaded, bodyMs]) => ({
              total: totalOf(gathered),
              entries: loaded.entries,
              stats: {
                segments: head.segments.length,
                ...tallyOf([...gathered.reads, ...loaded.reads]),
                headMs,
                indexMs,
                bodyMs,
              },
            })),
          );
        }),
      ),
    ),
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
