import { Effect, Option, pipe, String as Str } from "effect";

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

const renderPage = (request: Request): Promise<Response> =>
  Effect.runPromise(
    Effect.promise(() => import("@tanstack/react-start/server-entry")).pipe(
      Effect.flatMap(({ default: pages }) =>
        Effect.promise(() => Promise.resolve(pages.fetch(request))),
      ),
    ),
  );

const route = (request: Request): Response | Promise<Response> => {
  const { pathname } = new URL(request.url);
  if (pathname === MCP_PATH) {
    return unlessRejected(mcpRejection(request), () => serveMcp(request));
  }
  if (pipe(pathname, Str.startsWith(AUTH_PREFIX))) {
    return unlessRejected(authRejection(request), () => api.handle(request));
  }
  if (pipe(pathname, Str.startsWith(API_PREFIX))) {
    return api.handle(request);
  }
  return renderPage(request);
};

const unindexed = (request: Request): Promise<Response> =>
  Effect.runPromise(
    Effect.promise(() => Promise.resolve(route(request))).pipe(
      Effect.map((indexed) => {
        const response = new Response(indexed.body, indexed);
        response.headers.set("X-Robots-Tag", "noindex");
        return response;
      }),
    ),
  );

const worker: ExportedHandler = {
  fetch: unindexed,
  queue: (batch): Promise<void> => Effect.runPromise(ingestDeliveries(batch.messages)),
};

export { GuildStore } from "#/entities/guild-message/index.server";
export { NeuronBudget } from "#/shared/ai/index.server";
export { RequestCounter } from "./request-counter.server";
export default worker;
