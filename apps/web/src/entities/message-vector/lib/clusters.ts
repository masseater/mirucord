import { kmeans } from "ml-kmeans";

import { dequantize, quantize } from "#/shared/ai";
import type { Quantized } from "#/shared/ai";

import { nearestRows } from "./nearest";
import { blockOf } from "./vector-block";
import type { VectorBlock } from "./vector-block";

const MAX_ITERATIONS = 20;
const SEED = 1;
const MIN_CLUSTERS = 1;
const MAX_CLUSTERS = 256;
const NO_TIME = 0;

type Training = Readonly<{ sample: readonly Quantized[]; clusters: number }>;

type Probe = Readonly<{ vector: Quantized; centroids: VectorBlock; count: number }>;

const clusterCountFor = (vectors: number): number => {
  const rootCount = Math.round(Math.sqrt(vectors));
  return Math.min(MAX_CLUSTERS, Math.max(MIN_CLUSTERS, rootCount));
};

const trainCentroids = ({ sample, clusters }: Training): readonly Quantized[] => {
  const points = sample.map((vector) => [...dequantize(vector)]);
  const { centroids } = kmeans(points, Math.min(clusters, sample.length), {
    initialization: "kmeans++",
    seed: SEED,
    maxIterations: MAX_ITERATIONS,
  });
  return centroids.map((centroid) => quantize(centroid));
};

const centroidBlockOf = (centroids: readonly Quantized[]): VectorBlock =>
  blockOf(
    centroids.map((vector, index) => ({
      id: String(index),
      channelId: "",
      createdAt: NO_TIME,
      vector,
    })),
  );

const nearestCentroids = ({ vector, centroids, count }: Probe): readonly number[] =>
  nearestRows({ query: vector, block: centroids, keep: () => true, limit: count }).map(
    ({ row }) => row,
  );

export { centroidBlockOf, clusterCountFor, nearestCentroids, trainCentroids };
