import { runner } from "@r_masseater/workers-tracing/effect";
import { DurableObject } from "cloudflare:workers";
import { Layer } from "effect";

export const runTraced = runner(Layer.empty);

export abstract class TracedDurableObject extends DurableObject {
  protected readonly traced = runTraced;
}
