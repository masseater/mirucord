import { Cause, Effect, Exit, Match, Option, Schema } from "effect";

import { INGEST_MAX_RETRIES, QueueJobSchema } from "#/features/ingest/model/ingest-job";
import type {
  ForgetJob,
  QueueJob,
  RefreshJob,
  WithdrawJob,
} from "#/features/ingest/model/ingest-job";
import { alertOperators } from "#/shared/alert/index.server";

import { forgetMessages, refreshMessages } from "./gateway-jobs.server";
import { ingestChannel } from "./ingest-channel.server";
import { abandonWithdrawal, withdrawGuild } from "./withdraw-guild.server";
import type { GuildDataRemainsError } from "./withdraw-guild.server";

type QueueDelivery = Readonly<{
  body: unknown;
  attempts: number;
  ack: () => void;
  retry: () => void;
}>;

const decodeJob = Schema.decodeUnknownEffect(QueueJobSchema);

type JobError = Effect.Error<ReturnType<typeof ingestChannel>> | GuildDataRemainsError;

type KindJob = WithdrawJob | RefreshJob | ForgetJob;

const runKindJob = Match.type<KindJob>().pipe(
  Match.discriminatorsExhaustive("kind")({
    withdraw: ({ guildId }): Effect.Effect<void, JobError> => withdrawGuild(guildId),
    refresh: (job: RefreshJob): Effect.Effect<void, JobError> => refreshMessages(job),
    forget: (job: ForgetJob): Effect.Effect<void, JobError> => forgetMessages(job),
  }),
);

const runJob = (job: QueueJob): Effect.Effect<void, JobError> => {
  if ("kind" in job) {
    return runKindJob(job);
  }
  return ingestChannel(job);
};

const undoJob = (job: QueueJob): Effect.Effect<void> => {
  if ("kind" in job && job.kind === "withdraw") {
    return abandonWithdrawal(job.guildId);
  }
  return Effect.void;
};

const undoDelivery = (body: unknown): Effect.Effect<void> =>
  decodeJob(body).pipe(Effect.flatMap(undoJob), Effect.ignore);

const giveUpOrRetry = (delivery: QueueDelivery, cause: Cause.Cause<unknown>): Effect.Effect<void> =>
  Option.match(
    Option.liftPredicate(delivery, ({ attempts }) => attempts > INGEST_MAX_RETRIES),
    {
      onNone: () => Effect.logWarning("Queue job failed; retrying"),
      onSome: ({ body }) =>
        alertOperators(`Queue job gave up after retries: ${JSON.stringify(body)}`).pipe(
          Effect.andThen(undoDelivery(body)),
        ),
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
    Effect.flatMap(runJob),
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
