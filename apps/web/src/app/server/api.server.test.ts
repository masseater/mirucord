import { it } from "@effect/vitest";
import { signGatewayEvent } from "@repo/ingest-util-gateway-contract";
import { env } from "cloudflare:workers";
import { DateTime, Effect } from "effect";
import { expect } from "vite-plus/test";

import { SITE_ORIGIN } from "#/shared/config";

import { api } from "./api.server";

const BAD_REQUEST = 400;

it.live("passes the raw gateway body to the gateway handler", () =>
  Effect.gen(function* rawBody() {
    const sentAt = yield* DateTime.now;
    const body = '{"kind":"withdraw"}';
    const request = new Request(`${SITE_ORIGIN}/api/gateway`, {
      method: "POST",
      body,
      headers: {
        "content-type": "application/json",
        ...signGatewayEvent({ botToken: env.DISCORD_BOT_TOKEN, id: "api-test", sentAt, body }),
      },
    });
    const response = yield* Effect.promise(() => api.handle(request));
    expect(response.status).toBe(BAD_REQUEST);
  }),
);
