import { waitUntil } from "cloudflare:workers";
import { Effect, Layer, ManagedRuntime } from "effect";
import { FetchHttpClient } from "effect/http";
import { Otlp, OtlpExporter, OtlpSerialization } from "effect/observability";

const telemetryLive = Otlp.layerFromConfig({ resource: { serviceName: "web" } }).pipe(
  Layer.provide([FetchHttpClient.layer, OtlpSerialization.layerJson]),
);

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
