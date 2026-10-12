import handler from "@tanstack/react-start/server-entry";
import { Effect } from "effect";

import { ingestDeliveries } from "#/features/ingest/index.server";

const worker: ExportedHandler = {
  fetch: (request): Response | Promise<Response> => handler.fetch(request),
  queue: (batch): Promise<void> => Effect.runPromise(ingestDeliveries(batch.messages)),
};

export { GuildStore } from "#/entities/guild-message/index.server";
export default worker;
