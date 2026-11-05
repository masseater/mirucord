import { layer as workersTracing } from "@r_masseater/workers-tracing/effect";
import { DurableObject } from "cloudflare:workers";
import { ManagedRuntime } from "effect";
import type { Effect } from "effect";

const runtime = ManagedRuntime.make(workersTracing);

const runTraced = <Success, Failure>(effect: Effect.Effect<Success, Failure>): Promise<Success> =>
  runtime.runPromise(effect);

abstract class TracedDurableObject extends DurableObject {
  protected readonly traced = runTraced;
}

export { runTraced, TracedDurableObject };
