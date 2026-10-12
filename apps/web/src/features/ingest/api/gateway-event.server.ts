import { env } from "cloudflare:workers";
import { Effect, Match, Option, Schema } from "effect";

import { subjectOf } from "#/features/ingest/model/gateway-job";
import { verifyGatewayEvent } from "#/features/ingest/model/gateway-signature";
import { GatewayJobSchema } from "#/features/ingest/model/ingest-job";
import type { GatewayJob } from "#/features/ingest/model/ingest-job";

import { forgetMessages, refreshMessages, storeGatewayMessages } from "./gateway-jobs.server";
import { forgetGuild } from "./guild-membership.server";
import type { IngestError } from "./message-page.server";
import { resyncGuilds } from "./resync.server";
import { syncJoinedGuild, syncKnownGuild } from "./sync-guilds.server";

const PROCESSED = 200;
const FAILED = 500;
const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;

const decodeJob = Schema.decodeOption(Schema.fromJsonString(GatewayJobSchema));

const runJob: (job: GatewayJob) => Effect.Effect<void, IngestError> = Match.type<GatewayJob>().pipe(
  Match.discriminatorsExhaustive("kind")({
    join: ({ guildId }) => syncJoinedGuild(guildId),
    sync: ({ guildId }) => syncKnownGuild(guildId),
    leave: ({ guildId }) => forgetGuild(guildId),
    resync: () => resyncGuilds,
    store: storeGatewayMessages,
    refresh: refreshMessages,
    forget: forgetMessages,
  }),
);

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
