import { env } from "cloudflare:workers";
import { Effect, Option, Schema } from "effect";

import { GatewayJobSchema } from "#/features/ingest/model/ingest-job";
import type { GatewayJob } from "#/features/ingest/model/ingest-job";

import { forgetMessages, refreshMessages } from "./gateway-jobs.server";
import { verifyGatewayEvent } from "./gateway-signature";
import type { IngestError } from "./message-page.server";

const PROCESSED = 200;
const FAILED = 500;
const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;

const decodeJob = Schema.decodeUnknownOption(Schema.fromJsonString(GatewayJobSchema));

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
        Effect.as(new Response("Processed", { status: PROCESSED })),
        Effect.catchCause((cause) =>
          Effect.logError("Gateway event failed", cause).pipe(
            Effect.annotateLogs({ kind: job.kind, channelId: job.channelId }),
            Effect.as(new Response("Gateway event failed", { status: FAILED })),
          ),
        ),
      ),
  });

const receiveGatewayEvent = (request: Request): Promise<Response> =>
  Effect.runPromise(
    Effect.promise(() => request.text()).pipe(
      Effect.flatMap((body) => {
        if (
          !verifyGatewayEvent({
            botToken: env.DISCORD_BOT_TOKEN,
            body,
            headers: Object.fromEntries(request.headers),
          })
        ) {
          return Effect.succeed(
            new Response("Invalid gateway signature", { status: UNAUTHORIZED }),
          );
        }
        return processEvent(body);
      }),
    ),
  );

export { receiveGatewayEvent };
