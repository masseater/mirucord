import { env } from "cloudflare:workers";
import { Elysia, t } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

import { receiveGatewayEvent } from "#/features/ingest/index.server";
import { getAuth } from "#/shared/auth/index.server";

export const api = new Elysia({ adapter: CloudflareAdapter, aot: false })
  .get("/api/health", () => ({
    status: "ok",
    version: env.VERSION.tag,
    versionId: env.VERSION.id,
    deployedAt: env.VERSION.timestamp,
  }))
  .post(
    "/api/gateway",
    ({ body, request }) =>
      receiveGatewayEvent({ body, headers: Object.fromEntries(request.headers) }),
    { parse: "text", body: t.String() },
  )
  .mount((request) => getAuth().handler(request));
