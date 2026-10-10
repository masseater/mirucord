import { Cause, Effect, Exit, Option, Schema } from "effect";

import { INGEST_MAX_RETRIES, IngestJobSchema } from "#/features/ingest/model/ingest-job";
import { alertOperators } from "#/shared/alert/index.server";

import { ingestChannel } from "./ingest-channel.server";

type QueueDelivery = Readonly<{
  body: unknown;
  attempts: number;
  ack: () => void;
  retry: () => void;
}>;

const decodeJob = Schema.decodeUnknownEffect(IngestJobSchema);

const giveUpOrRetry = (delivery: QueueDelivery, cause: Cause.Cause<unknown>): Effect.Effect<void> =>
  Option.match(
    Option.liftPredicate(delivery, ({ attempts }) => attempts > INGEST_MAX_RETRIES),
    {
      onNone: () => Effect.logWarning("Channel ingest failed; retrying"),
      onSome: ({ body }) =>
        alertOperators(`Channel ingest gave up after retries: ${JSON.stringify(body)}`),
    },
  ).pipe(
    Effect.annotateLogs({
      job: delivery.body,
      attempts: delivery.attempts,
      cause: Cause.pretty(cause),
    }),
  );

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
        onFailure: (cause) =>
          giveUpOrRetry(delivery, cause).pipe(
            Effect.andThen(
              Effect.sync(() => {
                delivery.retry();
              }),
            ),
          ),
      }),
    ),
  );

const ingestDeliveries = (deliveries: readonly QueueDelivery[]): Effect.Effect<void> =>
  Effect.forEach(deliveries, processDelivery, { discard: true });

export { ingestDeliveries };
export type { QueueDelivery };
