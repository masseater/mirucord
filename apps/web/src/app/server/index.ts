import handler from "@tanstack/react-start/server-entry";
import { Effect } from "effect";

import { ingestDeliveries } from "#/features/ingest/index.server";
import { serveMcp } from "#/features/mcp/index.server";
import { MCP_URL } from "#/shared/config";

import { api } from "./api.server";

const MCP_PATH = new URL(MCP_URL).pathname;
const API_PREFIX = "/api/";

const route = (request: Request): Response | Promise<Response> => {
  const { pathname } = new URL(request.url);
  if (pathname === MCP_PATH) {
    return serveMcp(request);
  }
  if (pathname.startsWith(API_PREFIX)) {
    return api.handle(request);
  }
  return handler.fetch(request);
};

const worker: ExportedHandler = {
  fetch: route,
  queue: (batch): Promise<void> => Effect.runPromise(ingestDeliveries(batch.messages)),
};

export { GuildStore } from "#/entities/guild-message/index.server";
export default worker;
