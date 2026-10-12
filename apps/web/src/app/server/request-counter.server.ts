import { DurableObject } from "cloudflare:workers";
import { Clock, Effect } from "effect";

const ONE_HIT = 1;
const NEVER = 0;
const NO_HITS = 0;
const MS_PER_SECOND = 1000;

class RequestCounter extends DurableObject {
  #windowStart = NEVER;
  #hits = NO_HITS;

  #count(now: number, periodSeconds: number): number {
    if (now - this.#windowStart >= periodSeconds * MS_PER_SECOND) {
      this.#windowStart = now;
      this.#hits = NO_HITS;
    }
    this.#hits += ONE_HIT;
    return this.#hits;
  }

  public hit(limit: number, periodSeconds: number): Promise<boolean> {
    return Effect.runPromise(
      Clock.currentTimeMillis.pipe(Effect.map((now) => this.#count(now, periodSeconds) <= limit)),
    );
  }
}

export { RequestCounter };
