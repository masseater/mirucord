import { Array, Order, pipe } from "effect";

import { DIMENSIONS } from "#/shared/ai";
import type { Quantized } from "#/shared/ai";

import type { VectorBlock } from "./vector-block";

type Scored = Readonly<{ row: number; score: number }>;

type ScoreRequest = Readonly<{
  query: Quantized;
  block: VectorBlock;
  keep: (row: number) => boolean;
  limit: number;
}>;

const NO_SCORE = 0;
const NEXT = 1;

const byScore = Order.flip(Order.mapInput(Order.Number, ({ score }: Scored) => score));

const dotAt = (query: Int8Array, block: VectorBlock, row: number): number => {
  const offset = row * DIMENSIONS;
  let sum = NO_SCORE;
  for (let dimension = NO_SCORE; dimension < DIMENSIONS; dimension += NEXT) {
    sum += (query[dimension] ?? NO_SCORE) * (block.values[offset + dimension] ?? NO_SCORE);
  }
  return sum;
};

const scoreAt = ({ query, block }: ScoreRequest, row: number): number =>
  dotAt(query.values, block, row) * query.scale * (block.scales[row] ?? NO_SCORE);

const nearestRows = (request: ScoreRequest): readonly Scored[] =>
  pipe(
    Array.range(NO_SCORE, request.block.ordinals.length - NEXT),
    Array.filter((row) => row < request.block.ordinals.length && request.keep(row)),
    Array.map((row) => ({ row, score: scoreAt(request, row) })),
    (rows) => Array.sort(rows, byScore),
    Array.take(request.limit),
  );

export { nearestRows };
export type { ScoreRequest, Scored };
