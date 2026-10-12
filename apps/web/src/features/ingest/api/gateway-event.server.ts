import { env } from "cloudflare:workers";
import { Effect, Option, Schema } from "effect";

import { subjectOf } from "#/features/ingest/model/gateway-job";
import { verifyGatewayEvent } from "#/features/ingest/model/gateway-signature";
import { GatewayJobSchema } from "#/features/ingest/model/ingest-job";
import type { GatewayJob } from "#/features/ingest/model/ingest-job";

import { forgetMessages, refreshMessages } from "./gateway-jobs.server";
import type { IngestError } from "./message-page.server";
import { syncJoinedGuild, syncKnownGuild } from "./sync-guilds.server";

const PROCESSED = 200;
const FAILED = 500;
const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;

const decodeJob = Schema.decodeUnknownOption(Schema.fromJsonString(GatewayJobSchema));

const runJob = (job: GatewayJob): Effect.Effect<void, IngestError> => {
  if (job.kind === "join") {
    return syncJoinedGuild(job.guildId);
  }
  if (job.kind === "sync") {
    return syncKnownGuild(job.guildId);
  }
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
            Effect.annotateLogs(subjectOf(job)),
            Effect.as(new Response("Gateway event failed", { status: FAILED })),
          ),
        ),
      ),
  });

const receiveGatewayEvent = ({
  body,
  headers,
}: Readonly<{ body: string; headers: Readonly<Record<string, string>> }>): Promise<Response> => {
  if (
    !verifyGatewayEvent({
      botToken: env.DISCORD_BOT_TOKEN,
      body,
      headers,
    })
  ) {
    return Promise.resolve(new Response("Invalid gateway signature", { status: UNAUTHORIZED }));
  }
  return Effect.runPromise(processEvent(body));
};

export { receiveGatewayEvent };
