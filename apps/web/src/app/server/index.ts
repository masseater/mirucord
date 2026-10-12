import handler from "@tanstack/react-start/server-entry";
import { Boolean, Effect } from "effect";

import { ingestDeliveries } from "#/features/ingest/index.server";
import { serveMcp } from "#/features/mcp/index.server";
import { MCP_URL } from "#/shared/config";

const MCP_PATH = new URL(MCP_URL).pathname;

const worker: ExportedHandler = {
  fetch: (request): Response | Promise<Response> =>
    Boolean.match(new URL(request.url).pathname === MCP_PATH, {
      onTrue: () => serveMcp(request),
      onFalse: () => handler.fetch(request),
    }),
  queue: (batch): Promise<void> => Effect.runPromise(ingestDeliveries(batch.messages)),
};

export { GuildStore } from "#/entities/guild-message/index.server";
export default worker;
