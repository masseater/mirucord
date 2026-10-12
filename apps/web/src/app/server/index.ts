import handler from "@tanstack/react-start/server-entry";
import { Boolean, Effect } from "effect";

import { SYNC_CRON } from "#/features/ingest";
import { ingestDeliveries, pollGuilds, syncGuilds } from "#/features/ingest/index.server";
import { alertOperators } from "#/shared/alert/index.server";

const SYNC_FAILED = "Guild sync could not list servers from Discord";

const runCron = (cron: string): Effect.Effect<void> =>
  Boolean.match(cron === SYNC_CRON, {
    onTrue: () => syncGuilds,
    onFalse: () => pollGuilds,
  }).pipe(Effect.catchTag("DiscordRequestError", () => alertOperators(SYNC_FAILED)));

const worker: ExportedHandler = {
  fetch: (request): Response | Promise<Response> => handler.fetch(request),
  scheduled: (controller): Promise<void> => Effect.runPromise(runCron(controller.cron)),
  queue: (batch): Promise<void> => Effect.runPromise(ingestDeliveries(batch.messages)),
};

export default worker;
