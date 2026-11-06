import { runner } from "@r_masseater/workers-tracing/effect";
import { DurableObject } from "cloudflare:workers";
import { Layer } from "effect";

const runTraced = runner(Layer.empty);

abstract class TracedDurableObject extends DurableObject {
  protected readonly traced = runTraced;
}

export { runTraced, TracedDurableObject };
