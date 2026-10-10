import { env } from "cloudflare:workers";
import { Array, Effect } from "effect";

import type { IngestJob } from "#/features/ingest/model/ingest-job";

const QUEUE_BATCH_LIMIT = 100;

const enqueue = (jobs: readonly IngestJob[]): Effect.Effect<void> =>
  Effect.forEach(
    Array.chunksOf(jobs, QUEUE_BATCH_LIMIT),
    (chunk) => Effect.promise(() => env.INGEST.sendBatch(chunk.map((body) => ({ body })))),
    { discard: true },
  );

export { enqueue };
