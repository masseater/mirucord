import { env } from "cloudflare:workers";
import { DateTime, Duration, Effect, Exit, Number, Option, Schema } from "effect";

import { GatewayJobSchema } from "#/features/ingest/model/ingest-job";
import type { GatewayJob } from "#/features/ingest/model/ingest-job";
import {
  GATEWAY_SIGNATURE_HEADER,
  GATEWAY_TIMESTAMP_HEADER,
  verifyGatewayEvent,
} from "#/shared/crypto/index";

import { forgetMessages, refreshMessages } from "./gateway-jobs.server";
import type { IngestError } from "./message-page.server";

const PROCESSED = 200;
const FAILED = 500;
const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const ALLOWED_SKEW: Duration.Input = "5 minutes";

const decodeJob = Schema.decodeUnknownOption(Schema.fromJsonString(GatewayJobSchema));

const isFresh = (timestamp: string): Effect.Effect<boolean> =>
  DateTime.now.pipe(
    Effect.map((now) =>
      Option.match(Number.parse(timestamp), {
        onNone: () => false,
        onSome: (sentAt) =>
          Math.abs(DateTime.toEpochMillis(now) - sentAt) <=
          Duration.toMillis(Duration.fromInputUnsafe(ALLOWED_SKEW)),
      }),
    ),
  );

const isAuthentic = (request: Request, body: string): Effect.Effect<boolean> => {
  const timestamp = request.headers.get(GATEWAY_TIMESTAMP_HEADER) ?? "";
  const signature = request.headers.get(GATEWAY_SIGNATURE_HEADER) ?? "";
  return isFresh(timestamp).pipe(
    Effect.flatMap((fresh) => {
      if (!fresh) {
        return Effect.succeed(false);
      }
      return verifyGatewayEvent({ botToken: env.DISCORD_BOT_TOKEN, timestamp, body, signature });
    }),
  );
};

const runJob = (job: GatewayJob): Effect.Effect<void, IngestError> => {
  if (job.kind === "refresh") {
    return refreshMessages(job);
  }
  return forgetMessages(job);
};

const processEvent = (body: string): Effect.Effect<Response> =>
  Option.match(decodeJob(body), {
    onNone: () => Effect.succeed(new Response("Malformed gateway event", { status: BAD_REQUEST })),
    onSome: (job) =>
      runJob(job).pipe(
        Effect.exit,
        Effect.flatMap((exit) => {
          if (Exit.isSuccess(exit)) {
            return Effect.succeed(new Response("Processed", { status: PROCESSED }));
          }
          return Effect.logError("Gateway event failed", exit.cause).pipe(
            Effect.annotateLogs({ kind: job.kind, channelId: job.channelId }),
            Effect.as(new Response("Gateway event failed", { status: FAILED })),
          );
        }),
      ),
  });

const receiveGatewayEvent = (request: Request): Promise<Response> =>
  Effect.runPromise(
    Effect.promise(() => request.text()).pipe(
      Effect.flatMap((body) =>
        isAuthentic(request, body).pipe(
          Effect.flatMap((authentic) => {
            if (!authentic) {
              return Effect.succeed(
                new Response("Invalid gateway signature", { status: UNAUTHORIZED }),
              );
            }
            return processEvent(body);
          }),
        ),
      ),
    ),
  );

export { receiveGatewayEvent };
