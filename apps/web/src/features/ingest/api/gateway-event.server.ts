import { env } from "cloudflare:workers";
import { DateTime, Duration, Effect, Number, Option, Schema } from "effect";

import { GatewayJobSchema } from "#/features/ingest/model/ingest-job";
import {
  GATEWAY_SIGNATURE_HEADER,
  GATEWAY_TIMESTAMP_HEADER,
  verifyGatewayEvent,
} from "#/shared/crypto/index";

const ACCEPTED = 202;
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

const enqueueEvent = (body: string): Effect.Effect<Response> =>
  Option.match(decodeJob(body), {
    onNone: () => Effect.succeed(new Response("Malformed gateway event", { status: BAD_REQUEST })),
    onSome: (job) =>
      Effect.promise(() => env.INGEST.send(job)).pipe(
        Effect.as(new Response("Accepted", { status: ACCEPTED })),
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
            return enqueueEvent(body);
          }),
        ),
      ),
    ),
  );

export { receiveGatewayEvent };
