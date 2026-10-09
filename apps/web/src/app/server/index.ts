import handler from "@tanstack/react-start/server-entry";

import { ingestDeliveries, syncGuilds } from "#/features/ingest/index.server";
import { runRequest } from "#/shared/lib/index.server";

const worker: ExportedHandler = {
  fetch: (request): Response | Promise<Response> => handler.fetch(request),
  scheduled: (): Promise<void> => runRequest(syncGuilds),
  queue: (batch): Promise<void> => runRequest(ingestDeliveries(batch.messages)),
};

export default worker;
