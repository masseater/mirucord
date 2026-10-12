import handler from "@tanstack/react-start/server-entry";
import { Effect, Option } from "effect";

import { ingestDeliveries } from "#/features/ingest/index.server";
import { serveMcp } from "#/features/mcp/index.server";
import { MCP_URL } from "#/shared/config";

import { api } from "./api.server";
import { authRejection, mcpRejection } from "./throttle.server";

const MCP_PATH = new URL(MCP_URL).pathname;
const API_PREFIX = "/api/";
const AUTH_PREFIX = "/api/auth/";

const unlessRejected = (
  rejection: Effect.Effect<Option.Option<Response>>,
  next: () => Response | Promise<Response>,
): Promise<Response> => {
  const respond = Option.match({
    onSome: Effect.succeed<Response>,
    onNone: () => Effect.promise(() => Promise.resolve(next())),
  });
  return Effect.runPromise(rejection.pipe(Effect.flatMap(respond)));
};

const route = (request: Request): Response | Promise<Response> => {
  const { pathname } = new URL(request.url);
  if (pathname === MCP_PATH) {
    return unlessRejected(mcpRejection(request), () => serveMcp(request));
  }
  if (pathname.startsWith(AUTH_PREFIX)) {
    return unlessRejected(authRejection(request), () => api.handle(request));
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
export { RequestCounter } from "./request-counter.server";
export default worker;
