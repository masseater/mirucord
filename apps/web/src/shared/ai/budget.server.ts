import { env } from "cloudflare:workers";
import { DateTime, Effect } from "effect";

import { OBJECT_GENERATION, OBJECT_LOCATION } from "#/shared/config";

import type { Spending } from "./neuron-budget.server";

const BUDGET_NAME = `account${OBJECT_GENERATION}`;
const QUERY_LIMIT = 9000;
const LIVE_LIMIT = 8000;
const BACKGROUND_LIMIT = 7000;
const ONE_DAY = 1;

export type Priority = "query" | "live" | "background";

const LIMITS: Readonly<Record<Priority, number>> = {
  query: QUERY_LIMIT,
  live: LIVE_LIMIT,
  background: BACKGROUND_LIMIT,
};

const spendOn = (spending: Spending): Effect.Effect<boolean> =>
  Effect.promise(() => env.NEURON_BUDGET.getByName(BUDGET_NAME, OBJECT_LOCATION).spend(spending));

const today = DateTime.now.pipe(Effect.map(DateTime.formatIsoDateUtc));

export const spendNeurons = Effect.fn("spendNeurons")(function* spendNeurons(
  priority: Priority,
  neurons: number,
) {
  const day = yield* today;
  const granted = yield* spendOn({ status: "capped", day, neurons, limit: LIMITS[priority] });
  yield* Effect.annotateCurrentSpan({ priority, neurons, granted });
  return granted;
});

export const settleNeurons = Effect.fn("settleNeurons")(function* settleNeurons(neurons: number) {
  const day = yield* today;
  yield* spendOn({ status: "settled", day, neurons });
});

export const nextBudgetDay = DateTime.now.pipe(
  Effect.map((now) =>
    DateTime.toEpochMillis(DateTime.add(DateTime.startOf(now, "day"), { days: ONE_DAY })),
  ),
);
