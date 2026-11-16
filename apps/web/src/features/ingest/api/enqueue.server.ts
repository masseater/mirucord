import { env } from "cloudflare:workers";
import { Array, Effect, pipe } from "effect";

import type { QueueJob } from "#/features/ingest/model/ingest-job";

const QUEUE_BATCH_LIMIT = 100;

export const enqueue = (jobs: readonly QueueJob[]): Effect.Effect<void> =>
  Effect.forEach(
    Array.chunksOf(jobs, QUEUE_BATCH_LIMIT),
    (chunk) =>
      Effect.promise(() =>
        env.INGEST.sendBatch(
          pipe(
            chunk,
            Array.map((body) => ({ body })),
          ),
        ),
      ),
    { concurrency: 1, discard: true },
  );

export const enqueueCatchUps = (guildIds: readonly string[]): Effect.Effect<void> =>
  enqueue(
    pipe(
      guildIds,
      Array.map((guildId) => ({ kind: "catchUp", guildId })),
    ),
  );

export const enqueueWithdrawal = (guildId: string): Effect.Effect<void> =>
  Effect.promise(() => env.INGEST.send({ kind: "withdraw", guildId }));

export const enqueueMembers = (guildId: string): Effect.Effect<void> =>
  Effect.promise(() => env.INGEST.send({ kind: "members", guildId }));

export const enqueueMigration: Effect.Effect<void> = Effect.promise(() =>
  env.INGEST.send({ kind: "migrate" }),
);
