import handler from "@tanstack/react-start/server-entry";
import { Boolean, Effect } from "effect";

import { ingestDeliveries } from "#/features/ingest/index.server";
import { serveMcp } from "#/features/mcp/index.server";
import { MCP_URL } from "#/shared/config";

import { api } from "./api.server";

const MCP_PATH = new URL(MCP_URL).pathname;
const API_PREFIX = "/api/";

const worker: ExportedHandler = {
  fetch: (request): Response | Promise<Response> => {
    const { pathname } = new URL(request.url);
    return Boolean.match(pathname === MCP_PATH, {
      onTrue: () => serveMcp(request),
      onFalse: () =>
        Boolean.match(pathname.startsWith(API_PREFIX), {
          onTrue: () => api.handle(request),
          onFalse: () => handler.fetch(request),
        }),
    });
  },
  queue: (batch): Promise<void> => Effect.runPromise(ingestDeliveries(batch.messages)),
};

export { GuildStore } from "#/entities/guild-message/index.server";
export default worker;
