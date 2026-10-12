import { it } from "@effect/vitest";
import { Effect } from "effect";
import { describe, expect } from "vite-plus/test";

import { DIMENSIONS, quantize } from "#/shared/ai";

import { centroidBlockOf, clusterCountFor, nearestCentroids, trainCentroids } from "./clusters";
import { nearestRows } from "./nearest";
import { blockOf, decodeBlock, encodeBlock, entriesOf } from "./vector-block";

const ROW_COUNT = 3;
const NOISE_COUNT = 5;
const GROUP_COUNT = 4;
const FIRST = 0;
const countUp = (length: number): readonly number[] =>
  Array.from({ length }, (_value, index) => index);
const ROWS = countUp(ROW_COUNT);
const NOISES = countUp(NOISE_COUNT);
const GROUPS = countUp(GROUP_COUNT);
const GROUP_SPACING = 100;
const NOISE_STEP = 7;
const NOISE_MOD = 13;
const NOISE_SCALE = 1000;
const ONE = 1;
const MISSING = -1;
const SECOND = 1;
const THIRD_GROUP = 2;
const QUERY_NOISE = 9;
const MS = 1000;
const SMALL = 10_000;
const SMALL_CLUSTERS = 100;
const HUGE = 10_000_000;
const MAX_CLUSTERS = 256;

const axis = (index: number, noise: number): readonly number[] =>
  Array.from({ length: DIMENSIONS }, (_value, dimension) => {
    if (dimension === index) {
      return ONE;
    }
    return ((dimension * NOISE_STEP + noise) % NOISE_MOD) / NOISE_SCALE;
  });

const entryAt = (index: number): Parameters<typeof blockOf>[typeof FIRST][number] => ({
  ordinal: index * MS,
  channelId: `c${index}`,
  vector: quantize(axis(index, index)),
});

describe("vector blocks", () => {
  it.effect("round-trips ordinals, channels and vectors through bytes", () =>
    Effect.gen(function* roundTrip() {
      const entries: readonly ReturnType<typeof entryAt>[] = ROWS.map((index) => entryAt(index));
      const bytes = yield* encodeBlock(blockOf(entries));
      const decoded = entriesOf(yield* decodeBlock(bytes));
      const plain = (list: readonly (typeof entries)[number][]): readonly unknown[] =>
        list.map(({ ordinal, channelId, vector }) => ({
          ordinal,
          channelId,
          values: [...vector.values],
        }));
      expect(plain(decoded)).toStrictEqual(plain(entries));
    }),
  );

  it("ranks the closest vector first and skips filtered rows", () => {
    const block = blockOf(ROWS.map((index) => entryAt(index)));
    const query = quantize(axis(SECOND, QUERY_NOISE));
    const best = nearestRows({ query, block, keep: () => true, limit: ONE });
    const filtered = nearestRows({ query, block, keep: (row) => row !== SECOND, limit: ONE });
    expect(best.map(({ row }) => row)).toStrictEqual([SECOND]);
    expect(filtered.map(({ row }) => row)).not.toContain(SECOND);
  });
});

describe("clusters", () => {
  it("separates distinct groups and finds the right one for a query", () => {
    const sample = GROUPS.flatMap((group) =>
      NOISES.map((noise) => quantize(axis(group * GROUP_SPACING, noise))),
    );
    const centroids = trainCentroids({ sample, clusters: GROUPS.length });
    const block = centroidBlockOf(centroids);
    const groupOf = (vector: (typeof sample)[number]): number =>
      nearestCentroids({ vector, centroids: block, count: ONE })[FIRST] ?? MISSING;
    const query = quantize(axis(THIRD_GROUP * GROUP_SPACING, QUERY_NOISE));
    expect(centroids).toHaveLength(GROUPS.length);
    expect(new Set(sample.map((vector) => groupOf(vector))).size).toBe(GROUPS.length);
    const neighbour = quantize(axis(THIRD_GROUP * GROUP_SPACING, ONE));
    expect(groupOf(query)).toBe(groupOf(neighbour));
  });

  it("uses about the square root of the count", () => {
    expect(clusterCountFor(FIRST)).toBe(ONE);
    expect(clusterCountFor(SMALL)).toBe(SMALL_CLUSTERS);
    expect(clusterCountFor(HUGE)).toBe(MAX_CLUSTERS);
  });
});
