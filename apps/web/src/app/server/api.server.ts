import { Elysia } from "@r_masseater/workers-tracing/elysia";
import { GATEWAY_PATH } from "@repo/ingest-util-gateway-contract";
import { env } from "cloudflare:workers";
import { Record } from "effect";
import { t } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

import { receiveGatewayEvent } from "#/features/ingest/index.server";
import { getAuth } from "#/shared/auth/index.server";
import { runTraced } from "#/shared/observability/index.server";

export const api = new Elysia({ adapter: CloudflareAdapter, aot: false })
  .get("/api/health", () => ({
    status: "ok",
    version: env.VERSION.tag,
    versionId: env.VERSION.id,
    deployedAt: env.VERSION.timestamp,
  }))
  .post(
    GATEWAY_PATH,
    ({ body, request }) =>
      runTraced(receiveGatewayEvent({ body, headers: Record.fromEntries(request.headers) })),
    { parse: "text", body: t.String() },
  )
  .mount((request) => getAuth().handler(request));
