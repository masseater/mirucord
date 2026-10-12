import { runMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { layer as alchemistLayer } from "alchemy/Alchemist";
import { AuthProviders } from "alchemy/Auth";
import { state } from "alchemy/Cloudflare";
import { Effect, Layer } from "effect";
import { Argument, Command } from "effect/cli";
import { FetchHttpClient } from "effect/http";
import { OtlpSerialization, OtlpTracer } from "effect/observability";

import { copyStackState, dropStackState, requireStackState } from "./stack-state.ts";

const move = {
  from: Argument.String("from"),
  to: Argument.String("to"),
  stage: Argument.String("stage"),
  required: Argument.String("required").pipe(Argument.variadic()),
};

const copy = Command.make(
  "copy",
  move,
  Effect.fn("copy")(function* copy({ from, to, stage, required }) {
    const result = yield* copyStackState({ from, to, stage }, required);
    yield* Effect.logInfo(`${from}/${stage} -> ${to}/${stage}: ${result.status}`).pipe(
      Effect.annotateLogs(result),
    );
    yield* requireStackState(to, stage, required);
  }),
);

const drop = Command.make(
  "drop",
  move,
  Effect.fn("drop")(function* drop({ from, to, stage, required }) {
    const dropped = yield* dropStackState({ from, to, stage }, required);
    yield* Effect.logInfo(`${from}/${stage}: ${String(dropped)}`);
  }),
);

const cli = Command.make("stack-state").pipe(Command.withSubcommands([copy, drop]));

const stateLayer = state().pipe(
  Layer.provide(Layer.succeed(AuthProviders, {})),
  Layer.provide(alchemistLayer()),
);

const tracing = OtlpTracer.layerFromConfig({ resource: { serviceName: "stack-state" } }).pipe(
  Layer.provide([FetchHttpClient.layer, OtlpSerialization.layerJson]),
);

const program = Command.run(cli, { version: "0.0.0" });

const main = Layer.build(Layer.mergeAll(stateLayer, tracing, nodeServices)).pipe(
  Effect.flatMap((context) => Effect.provideContext(program, context)),
  Effect.scoped,
);

runMain(main);
