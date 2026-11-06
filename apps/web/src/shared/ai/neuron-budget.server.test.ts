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
      const sameDay = yield* Effect.all([
        spendNeurons("background", BACKFILL),
        spendNeurons("background", OVERFLOW),
        spendNeurons("query", QUERY),
        spendNeurons("live", ONE),
      ]);
      expect(sameDay).toStrictEqual([true, false, true, false]);
      yield* TestClock.adjust("1 day");
      const nextDaySpent = yield* spendNeurons("background", WHOLE_BACKFILL);
      expect(nextDaySpent).toBe(true);
    }),
  );

  it.effect("counts settled spending over the limit and lets refunds free room", () =>
    Effect.gen(function* settled() {
      yield* TestClock.adjust("5 days");
      yield* settleNeurons(OVERSPENT);
      const overspentQuery = yield* spendNeurons("query", ONE);
      expect(overspentQuery).toBe(false);
      yield* settleNeurons(REFUND);
      const refundedBackground = yield* spendNeurons("background", ONE);
      expect(refundedBackground).toBe(false);
      const imageLive = yield* spendNeurons("live", IMAGE);
      expect(imageLive).toBe(true);
    }),
  );
});
