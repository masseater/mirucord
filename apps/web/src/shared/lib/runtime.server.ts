import { waitUntil } from "cloudflare:workers";
import { Effect, Layer, ManagedRuntime } from "effect";
import { OtlpExporter } from "effect/observability";

import { telemetryLive } from "#/shared/telemetry/index.server";

const runtime = ManagedRuntime.make(Layer.mergeAll(telemetryLive, OtlpExporter.layerFlusher));

const flushTelemetry = Effect.gen(function* flushTelemetry() {
  const flusher = yield* OtlpExporter.Flusher;
  yield* flusher.flush;
});

const scheduleFlush = Effect.sync(() => {
  waitUntil(runtime.runPromise(flushTelemetry));
});

const runRequest = <Success>(
  effect: Effect.Effect<Success, never, ManagedRuntime.ManagedRuntime.Services<typeof runtime>>,
): Promise<Success> => runtime.runPromise(effect.pipe(Effect.ensuring(scheduleFlush)));

export { runRequest };
