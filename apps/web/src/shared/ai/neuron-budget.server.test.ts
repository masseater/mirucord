import { it } from "@effect/vitest";
import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { describe, expect } from "vite-plus/test";

import type { Spending } from "./neuron-budget.server";

const DAY = "2026-10-12";
const NEXT_DAY = "2026-10-13";
const LIMIT = 10;
const MOST = 8;
const MORE = 3;
const REST = 2;
const REFUND = -4;

const spender =
  (name: string) =>
  (spending: Spending): Effect.Effect<boolean> =>
    Effect.promise(() => env.NEURON_BUDGET.getByName(name).spend(spending));

describe("neuron budget", () => {
  it.effect("refuses spending past the daily limit and starts over the next day", () =>
    Effect.gen(function* capped() {
      const spend = spender("capped");
      expect(yield* spend({ status: "capped", day: DAY, neurons: MOST, limit: LIMIT })).toBe(true);
      expect(yield* spend({ status: "capped", day: DAY, neurons: MORE, limit: LIMIT })).toBe(false);
      expect(yield* spend({ status: "capped", day: DAY, neurons: REST, limit: LIMIT })).toBe(true);
      expect(yield* spend({ status: "capped", day: NEXT_DAY, neurons: MOST, limit: LIMIT })).toBe(
        true,
      );
      const spent = yield* Effect.promise(() =>
        env.NEURON_BUDGET.getByName("capped").spentOn(NEXT_DAY),
      );
      expect(spent).toBe(MOST);
    }),
  );

  it.effect("counts settled spending over the limit and lets refunds free room", () =>
    Effect.gen(function* settled() {
      const spend = spender("settled");
      expect(yield* spend({ status: "settled", day: DAY, neurons: LIMIT })).toBe(true);
      expect(yield* spend({ status: "settled", day: DAY, neurons: REFUND })).toBe(true);
      expect(yield* spend({ status: "capped", day: DAY, neurons: MORE, limit: LIMIT })).toBe(true);
    }),
  );
});
