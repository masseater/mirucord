import { it } from "@effect/vitest";
import { InMemoryService as inMemoryService, State } from "alchemy/State";
import type { ResourceState } from "alchemy/State";
import { Effect, Exit, Option } from "effect";
import { expect } from "vite-plus/test";

import { copyStackState, dropStackState, requireStackState } from "./stack-state";

const STAGE = "prod";
const MOVE = { from: "web", to: "mirucord", stage: STAGE };
const REQUIRED = ["MasterKey", "BetterAuthSecret"];
const OUTPUT = { url: "https://example.com" };
const NO_NAMESPACE: ResourceState["namespace"] = Option.getOrUndefined(Option.none());

const resource = (fqn: string, attr: Readonly<Record<string, string>>): ResourceState => ({
  resourceType: "Random",
  namespace: NO_NAMESPACE,
  fqn,
  logicalId: fqn,
  instanceId: `${fqn}-instance`,
  providerVersion: 0,
  status: "created",
  downstream: [],
  bindings: [],
  props: {},
  attr,
});

const SOURCE = [
  resource("MasterKey", { value: "master" }),
  resource("BetterAuthSecret", { value: "auth" }),
  resource("Web/DB", { id: "db" }),
];

const seeded = (): State["Service"] =>
  inMemoryService(
    {
      web: { prod: Object.fromEntries(SOURCE.map((record) => [record.fqn, record])) },
      other: { prod: { Kept: resource("Kept", {}) } },
    },
    { web: { prod: OUTPUT } },
  );

const snapshot = Effect.gen(function* snapshot() {
  const state = yield* yield* State;
  const fqns = yield* state.list({ stack: "mirucord", stage: STAGE });
  return {
    target: yield* Effect.forEach(
      fqns,
      (fqn) => state.get({ stack: "mirucord", stage: STAGE, fqn }),
      { concurrency: 1 },
    ),
    output: yield* state.getOutput({ stack: "mirucord", stage: STAGE }),
    sourceStages: yield* state.listStages("web"),
    otherStages: yield* state.listStages("other"),
  };
});

const overwriteMasterKey = Effect.gen(function* overwriteMasterKey() {
  const state = yield* yield* State;
  yield* state.set({
    stack: "mirucord",
    stage: STAGE,
    fqn: "MasterKey",
    value: resource("MasterKey", { value: "deployed" }),
  });
  return yield* state.get({ stack: "mirucord", stage: STAGE, fqn: "MasterKey" });
});

it.effect("copies every record and the output to the new stack", () =>
  Effect.gen(function* copied() {
    const result = yield* copyStackState(MOVE);
    yield* requireStackState("mirucord", STAGE, REQUIRED);
    expect(result).toStrictEqual({ status: "copied", fqns: SOURCE.map(({ fqn }) => fqn) });
    expect(yield* snapshot).toStrictEqual({
      target: SOURCE,
      output: OUTPUT,
      sourceStages: [STAGE],
      otherStages: [STAGE],
    });
  }).pipe(Effect.provideService(State, seeded())),
);

it.effect("leaves a stack that already has an output untouched", () =>
  Effect.gen(function* twice() {
    yield* copyStackState(MOVE);
    const deployed = yield* overwriteMasterKey;
    expect(yield* copyStackState(MOVE)).toStrictEqual({ status: "already-copied" });
    expect(yield* overwriteMasterKey).toStrictEqual(deployed);
  }).pipe(Effect.provideService(State, seeded())),
);

it.effect("fails when the required records are missing", () =>
  Effect.gen(function* missing() {
    expect(yield* copyStackState({ ...MOVE, from: "absent" })).toStrictEqual({
      status: "nothing-to-copy",
    });
    const exit = yield* Effect.exit(requireStackState("mirucord", STAGE, REQUIRED));
    expect(Exit.isFailure(exit)).toBe(true);
  }).pipe(Effect.provideService(State, seeded())),
);

it.effect("drops only the old stage after the copy", () =>
  Effect.gen(function* dropped() {
    yield* copyStackState(MOVE);
    expect(yield* dropStackState(MOVE, REQUIRED)).toBe(true);
    expect(yield* dropStackState(MOVE, REQUIRED)).toBe(false);
    expect(yield* snapshot).toStrictEqual({
      target: SOURCE,
      output: OUTPUT,
      sourceStages: [],
      otherStages: [STAGE],
    });
  }).pipe(Effect.provideService(State, seeded())),
);

it.effect("refuses to drop before the new stack holds the state", () =>
  Effect.gen(function* refused() {
    const exit = yield* Effect.exit(dropStackState(MOVE, REQUIRED));
    expect(Exit.isFailure(exit)).toBe(true);
    expect((yield* snapshot).sourceStages).toStrictEqual([STAGE]);
  }).pipe(Effect.provideService(State, seeded())),
);
