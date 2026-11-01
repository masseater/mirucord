import { it } from "@effect/vitest";
import { Array, Effect, Option, pipe } from "effect";
import { describe, expect } from "vite-plus/test";

import { DIMENSIONS, quantize } from "#/shared/ai";

import { groupEntries } from "./clusters";
import { nearestRows } from "./nearest";
import { blockOf, decodeBlock, encodeBlock, entriesOf } from "./vector-block";
import type { VectorEntry } from "./vector-block";

const ROW_COUNT = 3;
const GROUP_COUNT = 4;
const FIRST = 0;
const countUp = (length: number): readonly number[] => Array.makeBy(length, (index) => index);
const ROWS = countUp(ROW_COUNT);
const GROUPS = countUp(GROUP_COUNT);
const NOISE_STEP = 7;
const NOISE_MOD = 13;
const NOISE_SCALE = 1000;
const ONE = 1;
const SECOND = 1;
const QUERY_NOISE = 9;
const MS = 1000;
const MEMBERS_PER_GROUP = 1100;
const MEMBER_SPREAD = 90;
const AXES_PER_GROUP = 2;
const LARGE_INDEX_TIMEOUT = 60_000;
const NOTHING = 0;

const axis = (index: number, noise: number): readonly number[] =>
  Array.makeBy(DIMENSIONS, (dimension) => {
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
      const entries: readonly ReturnType<typeof entryAt>[] = pipe(
        ROWS,
        Array.map((index) => entryAt(index)),
      );
      const bytes = yield* encodeBlock(blockOf(entries));
      const decoded = entriesOf(yield* decodeBlock(bytes));
      const plain = (list: readonly (typeof entries)[number][]): readonly unknown[] =>
        pipe(
          list,
          Array.map(({ ordinal, channelId, vector }) => ({
            ordinal,
            channelId,
            values: [...vector.values],
          })),
        );
      expect(plain(decoded)).toStrictEqual(plain(entries));
    }),
  );

  it("ranks the closest vector first and skips filtered rows", () => {
    const block = blockOf(
      pipe(
        ROWS,
        Array.map((index) => entryAt(index)),
      ),
    );
    const query = quantize(axis(SECOND, QUERY_NOISE));
    const best = nearestRows({ query, block, keep: () => true, limit: ONE });
    const filtered = nearestRows({ query, block, keep: (row) => row !== SECOND, limit: ONE });
    expect(
      pipe(
        best,
        Array.map(({ row }) => row),
      ),
    ).toStrictEqual([SECOND]);
    expect(
      pipe(
        filtered,
        Array.map(({ row }) => row),
      ),
    ).not.toContain(SECOND);
  });
});

const memberVector = (group: number, member: number): ReturnType<typeof quantize> =>
  quantize(
    Array.makeBy(GROUP_COUNT * AXES_PER_GROUP, (dimension) => {
      if (dimension === group * AXES_PER_GROUP) {
        return ONE;
      }
      if (dimension === group * AXES_PER_GROUP + ONE) {
        return (member % MEMBER_SPREAD) / (MEMBER_SPREAD * AXES_PER_GROUP);
      }
      return NOTHING;
    }),
  );

const largeIndex: readonly VectorEntry[] = pipe(
  GROUPS,
  Array.flatMap((group) =>
    pipe(
      countUp(MEMBERS_PER_GROUP),
      Array.map((member) => ({
        ordinal: group * MEMBERS_PER_GROUP + member,
        channelId: `g${group}`,
        vector: memberVector(group, member),
      })),
    ),
  ),
);

type Cluster = readonly VectorEntry[];

const groupsIn = (cluster: Cluster): number =>
  new Set(
    pipe(
      cluster,
      Array.map(({ channelId }) => channelId),
    ),
  ).size;

const ordinalsIn = (clusters: readonly Cluster[]): readonly number[] =>
  pipe(
    clusters,
    Array.flatten,
    Array.map(({ ordinal }) => ordinal),
  );

describe("clusters", () => {
  it(
    "splits a large index into about square-root clusters that each stay inside one group",
    () => {
      const { centroids, clusters } = groupEntries({ flat: false, entries: largeIndex });
      const expected = Math.round(Math.sqrt(largeIndex.length));
      const ordinals = ordinalsIn(clusters);
      expect(clusters).toHaveLength(expected);
      expect(
        pipe(
          centroids,
          Option.map((list) => list.length),
        ),
      ).toStrictEqual(Option.some(expected));
      expect(
        pipe(
          clusters,
          Array.filter((cluster) => groupsIn(cluster) > ONE),
        ),
      ).toStrictEqual([]);
      expect(ordinals).toHaveLength(largeIndex.length);
      expect(new Set(ordinals).size).toBe(largeIndex.length);
    },
    LARGE_INDEX_TIMEOUT,
  );

  it("keeps a flat index as one cluster without centroids", () => {
    const { centroids, clusters } = groupEntries({ flat: true, entries: largeIndex });
    expect(Option.isNone(centroids)).toBe(true);
    expect(clusters).toStrictEqual([largeIndex]);
  });
});
