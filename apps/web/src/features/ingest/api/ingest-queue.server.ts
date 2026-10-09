import { Effect, Exit, Schema } from "effect";

import { IngestJobSchema } from "#/features/ingest/model/ingest-job";

import { ingestChannel } from "./ingest-channel.server";

type QueueDelivery = Readonly<{ body: unknown; ack: () => void; retry: () => void }>;

const decodeJob = Schema.decodeUnknownEffect(IngestJobSchema);

const processDelivery = (delivery: QueueDelivery): Effect.Effect<void> =>
  decodeJob(delivery.body).pipe(
    Effect.flatMap(ingestChannel),
    Effect.exit,
    Effect.flatMap((exit) =>
      Exit.match(exit, {
        onSuccess: () =>
          Effect.sync(() => {
            delivery.ack();
          }),
        onFailure: () =>
          Effect.logWarning("Channel ingest failed; retrying").pipe(
            Effect.andThen(
              Effect.sync(() => {
                delivery.retry();
              }),
            ),
          ),
      }),
    ),
  );

const ingestDeliveries = (
  deliveries: readonly Readonly<{ body: unknown; ack: () => void; retry: () => void }>[],
): Effect.Effect<void> => Effect.forEach(deliveries, processDelivery, { discard: true });

export { ingestDeliveries };
