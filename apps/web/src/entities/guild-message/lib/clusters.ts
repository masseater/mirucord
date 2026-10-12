import { Array, Option, Record } from "effect";
import { kmeans } from "ml-kmeans";

import { dequantize, quantize } from "#/shared/ai";
import type { Quantized } from "#/shared/ai";

import { nearestRows } from "./nearest";
import { blockOf } from "./vector-block";
import type { VectorBlock, VectorEntry } from "./vector-block";

const MAX_ITERATIONS = 20;
const SEED = 1;
const MIN_CLUSTERS = 1;
const MAX_CLUSTERS = 256;
const FLAT_LIMIT = 4096;
const SAMPLE_SIZE = 1024;
const FIRST = 0;
const NEAREST = 1;

const clusterCountFor = (vectors: number): number => {
  const rootCount = Math.round(Math.sqrt(vectors));
  return Math.min(MAX_CLUSTERS, Math.max(MIN_CLUSTERS, rootCount));
};

const trainCentroids = ({
  sample,
  clusters,
}: Readonly<{ sample: readonly Quantized[]; clusters: number }>): readonly Quantized[] => {
  const points = sample.map((vector) => [...dequantize(vector)]);
  const { centroids } = kmeans(points, Math.min(clusters, sample.length), {
    initialization: "kmeans++",
    seed: SEED,
    maxIterations: MAX_ITERATIONS,
  });
  return centroids.map((centroid) => quantize(centroid));
};

const centroidBlockOf = (centroids: readonly Quantized[]): VectorBlock =>
  blockOf(centroids.map((vector, ordinal) => ({ ordinal, channelId: "", vector })));

const nearestCentroids = ({
  vector,
  centroids,
  count,
}: Readonly<{ vector: Quantized; centroids: VectorBlock; count: number }>): readonly number[] =>
  nearestRows({ query: vector, block: centroids, keep: () => true, limit: count }).map(
    ({ row }) => row,
  );

type Grouping = Readonly<{ flat: boolean; entries: readonly VectorEntry[] }>;

type Grouped = Readonly<{
  centroids: Option.Option<readonly VectorEntry[]>;
  clusters: readonly (readonly VectorEntry[])[];
}>;

const sampleOf = (entries: readonly VectorEntry[]): readonly Quantized[] => {
  const stride = Math.max(NEAREST, Math.floor(entries.length / SAMPLE_SIZE));
  return entries
    .filter((_entry, index) => index % stride === FIRST)
    .slice(FIRST, SAMPLE_SIZE)
    .map(({ vector }) => vector);
};

const groupEntries = ({ flat, entries }: Grouping): Grouped => {
  if (flat || entries.length <= FLAT_LIMIT) {
    return { centroids: Option.none(), clusters: [entries] };
  }
  const centroids = trainCentroids({
    sample: sampleOf(entries),
    clusters: clusterCountFor(entries.length),
  });
  const block = centroidBlockOf(centroids);
  const byCluster = Array.groupBy(entries, ({ vector }) =>
    String(
      Array.head(nearestCentroids({ vector, centroids: block, count: NEAREST })).pipe(
        Option.getOrElse(() => FIRST),
      ),
    ),
  );
  return {
    centroids: Option.some(
      centroids.map((vector, ordinal) => ({ ordinal, channelId: "", vector })),
    ),
    clusters: centroids.map((_centroid, cluster): readonly VectorEntry[] =>
      Option.getOrElse(Record.get(byCluster, String(cluster)), () => []),
    ),
  };
};

export { centroidBlockOf, clusterCountFor, groupEntries, nearestCentroids, trainCentroids };
export type { Grouped, Grouping };
