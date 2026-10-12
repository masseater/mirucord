import { Array, Effect, Number, Option, Order, Record } from "effect";

import { nearestRows } from "#/entities/guild-message/lib/nearest";
import type { SealedEntry } from "#/entities/guild-message/lib/search-segment";
import { decodeBlock } from "#/entities/guild-message/lib/vector-block";
import type { VectorBlock } from "#/entities/guild-message/lib/vector-block";
import type { Quantized } from "#/shared/ai";
import { openBytes } from "#/shared/crypto/index.server";

import { cachedBytes, centroidsKey, clusterKey, readHead } from "./search-files.server";
import type { SearchHead, SegmentEntry, SegmentVectors } from "./search-files.server";
import { loadPage } from "./search-messages.server";

const PROBE_SHARE = 0.05;
const MIN_PROBES = 1;
const SINGLE_CLUSTER = 1;
const FIRST_CLUSTER = 0;

type SimilarRequest = Readonly<{
  guildId: string;
  key: CryptoKey;
  query: Quantized;
  channelIds: readonly string[];
  limit: number;
}>;

type SimilarEntry = SealedEntry & Readonly<{ score: number }>;

type SimilarResult = Readonly<{
  entries: readonly SimilarEntry[];
  stats: Readonly<{ segments: number; files: number; vectors: number }>;
}>;

type ScoredHit = Readonly<{ segment: string; ordinal: number; score: number }>;

type VectorSegment = Readonly<{ entry: SegmentEntry; vectors: SegmentVectors }>;

type Scanned = Readonly<{ hits: readonly ScoredHit[]; files: number; vectors: number }>;

const byScore = Order.flip(Order.mapInput(Number.Order, ({ score }: ScoredHit) => score));

const readBlock = (
  request: SimilarRequest,
  key: string,
): Effect.Effect<Option.Option<VectorBlock>> =>
  cachedBytes(key).pipe(
    Effect.flatMap(({ bytes }) =>
      Option.match(bytes, {
        onNone: () => Effect.succeedNone,
        onSome: (found) =>
          openBytes({ bytes: new Uint8Array(found), key: request.key, context: key }).pipe(
            Effect.flatMap(decodeBlock),
            Effect.asSome,
          ),
      }),
    ),
  );

const probedClusters = (
  request: SimilarRequest,
  { entry, vectors }: VectorSegment,
): Effect.Effect<readonly number[]> => {
  if (vectors.clusters <= SINGLE_CLUSTER) {
    return Effect.succeed([FIRST_CLUSTER]);
  }
  const probes = Math.max(MIN_PROBES, Math.ceil(vectors.clusters * PROBE_SHARE));
  const key = centroidsKey({
    guildId: request.guildId,
    segment: entry.name,
    through: vectors.through,
  });
  return readBlock(request, key).pipe(
    Effect.map(
      Option.match({
        onNone: () => [],
        onSome: (block) =>
          nearestRows({ query: request.query, block, keep: () => true, limit: probes }).map(
            ({ row }) => block.ordinals[row] ?? FIRST_CLUSTER,
          ),
      }),
    ),
  );
};

type Scan = Readonly<{
  request: SimilarRequest;
  segment: string;
  keep: (entry: Readonly<{ ordinal: number; channelId: string }>) => boolean;
}>;

const scoreBlock = ({ request, segment, keep }: Scan, block: VectorBlock): readonly ScoredHit[] =>
  nearestRows({
    query: request.query,
    block,
    keep: (row) =>
      keep({
        ordinal: block.ordinals[row] ?? FIRST_CLUSTER,
        channelId: block.channelIds[row] ?? "",
      }),
    limit: request.limit,
  }).map(({ row, score }) => ({
    segment,
    ordinal: block.ordinals[row] ?? FIRST_CLUSTER,
    score,
  }));

const scanSegment = (
  request: SimilarRequest,
  head: SearchHead,
  segment: VectorSegment,
): Effect.Effect<Scanned> => {
  const invalid = new Set(Option.getOrElse(Record.get(head.invalid, segment.entry.name), () => []));
  const allowed = new Set(request.channelIds);
  const scan: Scan = {
    request,
    segment: segment.entry.name,
    keep: ({ ordinal, channelId }) => allowed.has(channelId) && !invalid.has(ordinal),
  };
  return probedClusters(request, segment).pipe(
    Effect.flatMap((clusters) =>
      Effect.forEach(
        clusters,
        (cluster) =>
          readBlock(
            request,
            clusterKey({
              guildId: request.guildId,
              segment: segment.entry.name,
              through: segment.vectors.through,
              cluster,
            }),
          ),
        { concurrency: "unbounded" },
      ),
    ),
    Effect.map((blocks) => {
      const found = Array.getSomes(blocks);
      return {
        hits: found.flatMap((block) => scoreBlock(scan, block)),
        files: blocks.length,
        vectors: Number.sumAll(found.map(({ ordinals }) => ordinals.length)),
      };
    }),
  );
};

const vectorSegments = (head: SearchHead): readonly VectorSegment[] =>
  head.segments.flatMap((entry) =>
    Option.toArray(
      Option.map(Option.fromUndefinedOr(entry.vectors), (vectors) => ({ entry, vectors })),
    ),
  );

const searchSimilar = (request: SimilarRequest): Effect.Effect<SimilarResult> =>
  readHead(request.guildId).pipe(
    Effect.flatMap((head) => {
      const segments = vectorSegments(head);
      return Effect.forEach(segments, (segment) => scanSegment(request, head, segment), {
        concurrency: "unbounded",
      }).pipe(Effect.map((scans) => ({ scans, segments: segments.length })));
    }),
    Effect.flatMap(({ scans, segments }) => {
      const top = Array.take(scans.flatMap(({ hits }) => hits).toSorted(byScore), request.limit);
      const stats = {
        segments,
        files: Number.sumAll(scans.map(({ files }) => files)),
        vectors: Number.sumAll(scans.map(({ vectors }) => vectors)),
      };
      return loadPage({ guildId: request.guildId, page: top }).pipe(
        Effect.map(({ entries }) => ({
          entries: Array.zipWith(entries, top, (entry, { score }) => ({ ...entry, score })),
          stats,
        })),
      );
    }),
    Effect.catchTag("MissingFile", () =>
      Effect.succeed({
        entries: [],
        stats: { segments: FIRST_CLUSTER, files: FIRST_CLUSTER, vectors: FIRST_CLUSTER },
      }),
    ),
    Effect.tap(({ entries, stats }) =>
      Effect.logInfo("Similar search finished").pipe(
        Effect.annotateLogs({ guildId: request.guildId, found: entries.length, ...stats }),
      ),
    ),
    Effect.withSpan("search.similar", { attributes: { guildId: request.guildId } }),
  );

export { searchSimilar };
export type { SimilarEntry, SimilarRequest, SimilarResult };
