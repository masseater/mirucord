import handler from "@tanstack/react-start/server-entry";
import { Effect } from "effect";

import { ingestDeliveries, syncGuilds } from "#/features/ingest/index.server";
import { alertOperators } from "#/shared/alert/index.server";
import { runRequest } from "#/shared/lib/index.server";

const SYNC_FAILED = "Guild sync could not list servers from Discord";

const worker: ExportedHandler = {
  fetch: (request): Response | Promise<Response> => handler.fetch(request),
  scheduled: (): Promise<void> =>
    runRequest(
      syncGuilds.pipe(Effect.catchTag("DiscordRequestError", () => alertOperators(SYNC_FAILED))),
    ),
  queue: (batch): Promise<void> => runRequest(ingestDeliveries(batch.messages)),
};

export default worker;
