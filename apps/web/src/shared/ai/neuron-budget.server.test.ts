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
      const firstDay = yield* Effect.all({
        backfill: spendNeurons("background", BACKFILL),
        overflow: spendNeurons("background", OVERFLOW),
        query: spendNeurons("query", QUERY),
        live: spendNeurons("live", ONE),
      });
      expect(firstDay).toStrictEqual({ backfill: true, overflow: false, query: true, live: false });
      yield* TestClock.adjust("1 day");
      const nextDay = yield* spendNeurons("background", WHOLE_BACKFILL);
      expect(nextDay).toBe(true);
    }),
  );

  it.effect("counts settled spending over the limit and lets refunds free room", () =>
    Effect.gen(function* settled() {
      yield* TestClock.adjust("5 days");
      yield* settleNeurons(OVERSPENT);
      const query = yield* spendNeurons("query", ONE);
      expect(query).toBe(false);
      yield* settleNeurons(REFUND);
      const background = yield* spendNeurons("background", ONE);
      expect(background).toBe(false);
      const live = yield* spendNeurons("live", IMAGE);
      expect(live).toBe(true);
    }),
  );
});
