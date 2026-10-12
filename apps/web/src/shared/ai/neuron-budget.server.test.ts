import { it } from "@effect/vitest";
import { Effect } from "effect";
import { TestClock } from "effect/testing";
import { describe, expect } from "vite-plus/test";

import { settleNeurons, spendNeurons } from "./budget.server";

const BACKFILL = 6000;
const OVERFLOW = 2000;
const QUERY = 2000;
const ONE = 1;
const WHOLE_BACKFILL = 7000;
const OVERSPENT = 9000;
const REFUND = -2000;
const IMAGE = 500;

describe("neuron budget", () => {
  it.effect("lets queries use what backfill and images may not, and starts over each day", () =>
    Effect.gen(function* capped() {
      expect(yield* spendNeurons("background", BACKFILL)).toBe(true);
      expect(yield* spendNeurons("background", OVERFLOW)).toBe(false);
      expect(yield* spendNeurons("query", QUERY)).toBe(true);
      expect(yield* spendNeurons("live", ONE)).toBe(false);
      yield* TestClock.adjust("1 day");
      expect(yield* spendNeurons("background", WHOLE_BACKFILL)).toBe(true);
    }),
  );

  it.effect("counts settled spending over the limit and lets refunds free room", () =>
    Effect.gen(function* settled() {
      yield* TestClock.adjust("5 days");
      yield* settleNeurons(OVERSPENT);
      expect(yield* spendNeurons("query", ONE)).toBe(false);
      yield* settleNeurons(REFUND);
      expect(yield* spendNeurons("background", ONE)).toBe(false);
      expect(yield* spendNeurons("live", IMAGE)).toBe(true);
    }),
  );
});
