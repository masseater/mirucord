import { Array, DateTime, Effect, Layer, Schedule, Schema } from "effect";
import type { Scope } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClientError } from "effect/http";

import { GatewayJobSchema } from "#/features/ingest";
import type { GatewayJob } from "#/features/ingest";
import { SITE_ORIGIN } from "#/shared/config/site";
import { signGatewayEvent } from "#/shared/crypto/index";

const GATEWAY_ENDPOINT = `${SITE_ORIGIN}/api/gateway`;
const RETRY_TIMES = 5;
const RETRY_BASE = "1 second";

const encodeJob = Schema.encodeEffect(Schema.fromJsonString(GatewayJobSchema));

const signedRequest = (
  botToken: string,
  job: GatewayJob,
): Effect.Effect<HttpClientRequest.HttpClientRequest> =>
  Effect.gen(function* signRequest() {
    const body = yield* encodeJob(job).pipe(Effect.orDie);
    const sentAt = yield* DateTime.now;
    const id = `${job.kind}-${Array.headNonEmpty(job.messageIds)}-${DateTime.toEpochMillis(sentAt)}`;
    return HttpClientRequest.post(GATEWAY_ENDPOINT).pipe(
      HttpClientRequest.setHeaders(signGatewayEvent({ botToken, id, sentAt, body })),
      HttpClientRequest.bodyText(body, "application/json"),
    );
  });

const deliverOnce = (
  botToken: string,
  job: GatewayJob,
): Effect.Effect<void, HttpClientError.HttpClientError, HttpClient.HttpClient> =>
  signedRequest(botToken, job).pipe(
    Effect.flatMap((request) => HttpClient.execute(request)),
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.asVoid,
  );

const deliverWithRetry = (
  botToken: string,
  job: GatewayJob,
): Effect.Effect<void, never, HttpClient.HttpClient> =>
  deliverOnce(botToken, job).pipe(
    Effect.retry({ schedule: Schedule.exponential(RETRY_BASE), times: RETRY_TIMES }),
    Effect.catchCause((cause) =>
      Effect.logError("Gateway event was not delivered", cause).pipe(
        Effect.annotateLogs({ kind: job.kind, channelId: job.channelId }),
      ),
    ),
  );

const makeDeliver = (
  botToken: string,
): Effect.Effect<(job: GatewayJob) => Effect.Effect<void>, never, Scope.Scope> =>
  Layer.build(FetchHttpClient.layer).pipe(
    Effect.map(
      (context) =>
        (job: GatewayJob): Effect.Effect<void> =>
          deliverWithRetry(botToken, job).pipe(Effect.provideContext(context)),
    ),
  );

export { makeDeliver };
