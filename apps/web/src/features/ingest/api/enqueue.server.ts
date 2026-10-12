import { env } from "cloudflare:workers";
import { Array, Effect } from "effect";

import type { QueueJob } from "#/features/ingest/model/ingest-job";

const QUEUE_BATCH_LIMIT = 100;

const enqueue = (jobs: readonly QueueJob[]): Effect.Effect<void> =>
  Effect.forEach(
    Array.chunksOf(jobs, QUEUE_BATCH_LIMIT),
    (chunk) => Effect.promise(() => env.INGEST.sendBatch(chunk.map((body) => ({ body })))),
    { discard: true },
  );

const enqueueCatchUps = (guildIds: readonly string[]): Effect.Effect<void> =>
  enqueue(guildIds.map((guildId) => ({ kind: "catchUp", guildId })));

const enqueueWithdrawal = (guildId: string): Effect.Effect<void> =>
  Effect.promise(() => env.INGEST.send({ kind: "withdraw", guildId }));

const enqueueMigration: Effect.Effect<void> = Effect.promise(() =>
  env.INGEST.send({ kind: "migrate" }),
);

export { enqueue, enqueueCatchUps, enqueueMigration, enqueueWithdrawal };
