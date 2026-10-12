import { env } from "cloudflare:workers";
import { DateTime, Effect } from "effect";

import type { NeuronBudget } from "./neuron-budget.server";

const BUDGET_NAME = "account";
const LIVE_LIMIT = 9000;
const BACKGROUND_LIMIT = 7000;
const ONE_DAY = 1;

type Priority = "live" | "background";

const LIMITS: Readonly<Record<Priority, number>> = {
  live: LIVE_LIMIT,
  background: BACKGROUND_LIMIT,
};

const budget = (): DurableObjectStub<NeuronBudget> => env.NEURON_BUDGET.getByName(BUDGET_NAME);

const today = DateTime.now.pipe(Effect.map(DateTime.formatIsoDateUtc));

const spendNeurons = Effect.fn("spendNeurons")(function* spendNeurons(
  priority: Priority,
  neurons: number,
) {
  const day = yield* today;
  const granted = yield* Effect.promise(() =>
    budget().spend({ status: "capped", day, neurons, limit: LIMITS[priority] }),
  );
  yield* Effect.annotateCurrentSpan({ priority, neurons, granted });
  return granted;
});

const settleNeurons = Effect.fn("settleNeurons")(function* settleNeurons(neurons: number) {
  const day = yield* today;
  yield* Effect.promise(() => budget().spend({ status: "settled", day, neurons }));
});

const nextBudgetDay = DateTime.now.pipe(
  Effect.map((now) =>
    DateTime.toEpochMillis(DateTime.add(DateTime.startOf(now, "day"), { days: ONE_DAY })),
  ),
);

export { nextBudgetDay, settleNeurons, spendNeurons };
export type { Priority };
