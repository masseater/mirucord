import { env } from "cloudflare:workers";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

import { auth } from "#/shared/auth/index.server";

export const api = new Elysia({ adapter: CloudflareAdapter, aot: false })
  .get("/api/health", () => ({
    status: "ok",
    version: env.VERSION.tag,
    versionId: env.VERSION.id,
    deployedAt: env.VERSION.timestamp,
  }))
  .mount(auth.handler);
