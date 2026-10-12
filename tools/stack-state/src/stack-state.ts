import { State, isResourceState } from "alchemy/State";
import { Array as Arr, Effect, Option, Predicate } from "effect";

type StackMove = Readonly<{ from: string; to: string; stage: string }>;

type CopyResult =
  | Readonly<{ status: "already-copied" }>
  | Readonly<{ status: "nothing-to-copy" }>
  | Readonly<{ status: "copied"; fqns: readonly string[] }>;

const copyRecord = Effect.fn("copyRecord")(function* copyRecord(
  { from, to, stage }: StackMove,
  fqn: string,
) {
  const state = yield* yield* State;
  const value = yield* state.get({ stack: from, stage, fqn });
  yield* Option.match(Option.fromNullishOr(value), {
    onNone: () => Effect.void,
    onSome: (found) => state.set({ stack: to, stage, fqn, value: found }),
  });
});

const copyOutput = Effect.fn("copyOutput")(function* copyOutput({ from, to, stage }: StackMove) {
  const state = yield* yield* State;
  const output = yield* state.getOutput({ stack: from, stage });
  yield* Effect.when(
    state.setOutput({ stack: to, stage, value: output }),
    Effect.succeed(Predicate.isNotUndefined(output)),
  );
});

const copyRecords = Effect.fn("copyRecords")(function* copyRecords(move: StackMove) {
  const state = yield* yield* State;
  const [sourceFqns, targetFqns] = yield* Effect.all([
    state.list({ stack: move.from, stage: move.stage }),
    state.list({ stack: move.to, stage: move.stage }),
  ]);
  const foreign = Arr.difference(targetFqns, sourceFqns);
  if (Arr.isReadonlyArrayNonEmpty(foreign)) {
    return yield* Effect.die(
      new Error(
        `${move.to}/${move.stage} に ${move.from} に無い state がある: ${foreign.join(", ")}`,
      ),
    );
  }
  const missing = Arr.difference(sourceFqns, targetFqns);
  yield* Effect.forEach(missing, (fqn) => copyRecord(move, fqn), {
    concurrency: 8,
    discard: true,
  });
  yield* copyOutput(move);
  return Arr.match(sourceFqns, {
    onEmpty: (): CopyResult => ({ status: "nothing-to-copy" }),
    onNonEmpty: (): CopyResult => ({ status: "copied", fqns: missing }),
  });
});

const instanceIdOf = Effect.fn("instanceIdOf")(function* instanceIdOf(
  stack: string,
  stage: string,
  fqn: string,
) {
  const state = yield* yield* State;
  const value = yield* state.get({ stack, stage, fqn });
  return Option.liftPredicate(value, isResourceState).pipe(
    Option.map((resource) => resource.instanceId),
  );
});

const requireSameInstance = Effect.fn("requireSameInstance")(function* requireSameInstance(
  { from, to, stage }: StackMove,
  fqn: string,
) {
  const [source, target] = yield* Effect.all([
    instanceIdOf(from, stage, fqn),
    instanceIdOf(to, stage, fqn),
  ]);
  const conflicting =
    Option.isSome(source) && Option.isSome(target) && source.value !== target.value;
  if (conflicting) {
    return yield* Effect.die(
      new Error(`${to}/${stage}/${fqn} は ${from}/${stage}/${fqn} と別のリソースの state である`),
    );
  }
  return fqn;
});

const copyStackState = Effect.fn("copyStackState")(function* copyStackState(
  move: StackMove,
  required: readonly string[],
) {
  const state = yield* yield* State;
  yield* Effect.forEach(required, (fqn) => requireSameInstance(move, fqn), { discard: true });
  const targetOutput = yield* state.getOutput({ stack: move.to, stage: move.stage });
  if (Predicate.isNotUndefined(targetOutput)) {
    return { status: "already-copied" } satisfies CopyResult;
  }
  return yield* copyRecords(move);
});

const requireStackState = Effect.fn("requireStackState")(function* requireStackState(
  stack: string,
  stage: string,
  required: readonly string[],
) {
  const state = yield* yield* State;
  const absent = Arr.difference(required, yield* state.list({ stack, stage }));
  if (Arr.isReadonlyArrayNonEmpty(absent)) {
    return yield* Effect.die(
      new Error(`${stack}/${stage} の state に ${absent.join(", ")} が無い`),
    );
  }
  return required;
});

const requireOutput = Effect.fn("requireOutput")(function* requireOutput(
  stack: string,
  stage: string,
) {
  const state = yield* yield* State;
  const output = yield* state.getOutput({ stack, stage });
  if (Predicate.isUndefined(output)) {
    return yield* Effect.die(new Error(`${stack}/${stage} の output が無い`));
  }
  return output;
});

const dropStackState = Effect.fn("dropStackState")(function* dropStackState(
  { from, to, stage }: StackMove,
  required: readonly string[],
) {
  const state = yield* yield* State;
  yield* requireStackState(to, stage, required);
  yield* requireOutput(to, stage);
  const [sourceFqns, sourceOutput] = yield* Effect.all([
    state.list({ stack: from, stage }),
    state.getOutput({ stack: from, stage }),
  ]);
  if (Arr.isReadonlyArrayEmpty(sourceFqns) && Predicate.isUndefined(sourceOutput)) {
    return false;
  }
  yield* state.deleteStack({ stack: from, stage });
  return true;
});

export type { StackMove };
export { copyStackState, dropStackState, requireStackState };
