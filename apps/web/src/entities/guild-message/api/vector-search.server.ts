import { Array, Effect, Number, Option, Order, Record } from "effect";

import { nearestRows } from "#/entities/guild-message/lib/nearest";
import type { SealedEntry } from "#/entities/guild-message/lib/search-segment";
import { decodeBlock } from "#/entities/guild-message/lib/vector-block";
import type { VectorBlock } from "#/entities/guild-message/lib/vector-block";
import type { Quantized } from "#/shared/ai";
import { openBytes } from "#/shared/crypto/index.server";

import { cachedBytes } from "./search-cache.server";
import { centroidsKey, clusterKey, readHead } from "./search-files.server";
import type { SearchHead, SegmentEntry, SegmentVectors } from "./search-files.server";
import { loadPage } from "./search-page.server";

const PROBE_SHARE = 0.05;
const MIN_PROBES = 1;
const SINGLE_CLUSTER = 1;
const FIRST_CLUSTER = 0;
const ONE_FILE = 1;

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

type Probe = Readonly<{ segment: VectorSegment; cluster: number }>;

const scanProbe = (
  request: SimilarRequest,
  head: SearchHead,
  { segment, cluster }: Probe,
): Effect.Effect<Scanned> => {
  const invalid = new Set(Option.getOrElse(Record.get(head.invalid, segment.entry.name), () => []));
  const allowed = new Set(request.channelIds);
  const scan: Scan = {
    request,
    segment: segment.entry.name,
    keep: ({ ordinal, channelId }) => allowed.has(channelId) && !invalid.has(ordinal),
  };
  return readBlock(
    request,
    clusterKey({
      guildId: request.guildId,
      segment: segment.entry.name,
      through: segment.vectors.through,
      cluster,
    }),
  ).pipe(
    Effect.map((block) => {
      const found = Option.toArray(block);
      return {
        hits: found.flatMap((opened) => scoreBlock(scan, opened)),
        files: ONE_FILE,
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

const probeCount = (clusters: number): number =>
  Math.max(MIN_PROBES, Math.ceil(clusters * PROBE_SHARE));

const nearestProbes = (
  request: SimilarRequest,
  clustered: readonly VectorSegment[],
  block: VectorBlock,
): readonly Probe[] => {
  const byName = new Map(clustered.map((segment) => [segment.entry.name, segment]));
  const totalClusters = Number.sumAll(clustered.map(({ vectors }) => vectors.clusters));
  const segmentAt = (row: number): Option.Option<VectorSegment> =>
    Option.fromUndefinedOr(byName.get(block.channelIds[row] ?? ""));
  return nearestRows({
    query: request.query,
    block,
    keep: (row) => Option.isSome(segmentAt(row)),
    limit: probeCount(totalClusters),
  }).flatMap(({ row }) =>
    Option.toArray(
      Option.map(segmentAt(row), (segment) => ({
        segment,
        cluster: block.ordinals[row] ?? FIRST_CLUSTER,
      })),
    ),
  );
};

const clusteredProbes = (
  request: SimilarRequest,
  head: SearchHead,
  clustered: readonly VectorSegment[],
): Effect.Effect<readonly Probe[]> =>
  Option.match(Option.fromUndefinedOr(head.centroids), {
    onNone: () => Effect.succeed([]),
    onSome: (stamp) =>
      readBlock(request, centroidsKey({ guildId: request.guildId, stamp })).pipe(
        Effect.map(
          Option.match({
            onNone: () => [],
            onSome: (block) => nearestProbes(request, clustered, block),
          }),
        ),
      ),
  });

const probesOf = (
  request: SimilarRequest,
  head: SearchHead,
  segments: readonly VectorSegment[],
): Effect.Effect<readonly Probe[]> => {
  const isClustered = ({ vectors }: VectorSegment): boolean => vectors.clusters > SINGLE_CLUSTER;
  const flat = segments.filter((segment) => !isClustered(segment));
  const clustered = segments.filter((segment) => isClustered(segment));
  return clusteredProbes(request, head, clustered).pipe(
    Effect.map((probes) => [
      ...flat.map((segment) => ({ segment, cluster: FIRST_CLUSTER })),
      ...probes,
    ]),
  );
};

const searchSimilar = (request: SimilarRequest): Effect.Effect<SimilarResult> =>
  readHead(request.guildId).pipe(
    Effect.flatMap((head) => {
      const segments = vectorSegments(head);
      return probesOf(request, head, segments).pipe(
        Effect.flatMap((probes) =>
          Effect.forEach(probes, (probe) => scanProbe(request, head, probe), {
            concurrency: "unbounded",
          }),
        ),
        Effect.map((scans) => ({ scans, segments: segments.length })),
      );
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
