import { it } from "@effect/vitest";
import { env } from "cloudflare:workers";
import { DateTime, Effect, Schema } from "effect";
import type { Duration } from "effect";
import { beforeEach, expect, vi } from "vite-plus/test";

import { signGatewayEvent } from "#/features/ingest/model/gateway-signature";
import { GatewayJobSchema } from "#/features/ingest/model/ingest-job";
import { SITE_ORIGIN } from "#/shared/config";

import { receiveGatewayEvent } from "./gateway-event.server";

const PROCESSED = 200;
const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const STALE_BY: Duration.Input = "10 minutes";

const encodeJson = Schema.encodeUnknownEffect(Schema.fromJsonString(GatewayJobSchema));

const JOB = { kind: "forget", guildId: "700", channelId: "710", messageIds: ["711"] } as const;

const signedRequest = (
  body: string,
  sentAt: DateTime.Utc,
  botToken: string,
): Effect.Effect<Request> =>
  Effect.sync(
    () =>
      new Request(`${SITE_ORIGIN}/api/gateway`, {
        method: "POST",
        body,
        headers: signGatewayEvent({ botToken, id: "test-event", sentAt, body }),
      }),
  );

const statusOf = (request: Request): Effect.Effect<number> =>
  Effect.promise(() => request.text()).pipe(
    Effect.flatMap((body) =>
      Effect.promise(() =>
        receiveGatewayEvent({ body, headers: Object.fromEntries(request.headers) }),
      ),
    ),
    Effect.map(({ status }) => status),
  );

beforeEach(() => {
  vi.spyOn(env.INGEST, "send").mockResolvedValue({
    metadata: { metrics: { backlogCount: 0, backlogBytes: 0 } },
  });
});

it.live("processes a signed gateway event without the queue", () =>
  Effect.gen(function* signedEvent() {
    const now = yield* DateTime.now;
    const send = vi.spyOn(env.INGEST, "send");
    const body = yield* encodeJson(JOB).pipe(Effect.orDie);
    const request = yield* signedRequest(body, now, env.DISCORD_BOT_TOKEN);
    expect(yield* statusOf(request)).toBe(PROCESSED);
    expect(send).not.toHaveBeenCalled();
  }),
);

it.live("rejects an event signed with another token", () =>
  Effect.gen(function* forgedEvent() {
    const now = yield* DateTime.now;
    const send = vi.spyOn(env.INGEST, "send");
    const body = yield* encodeJson(JOB).pipe(Effect.orDie);
    const request = yield* signedRequest(body, now, "another-token");
    expect(yield* statusOf(request)).toBe(UNAUTHORIZED);
    expect(send).not.toHaveBeenCalled();
  }),
);

it.live("rejects a replayed event", () =>
  Effect.gen(function* staleEvent() {
    const now = yield* DateTime.now;
    const sentAt = DateTime.subtractDuration(now, STALE_BY);
    const body = yield* encodeJson(JOB).pipe(Effect.orDie);
    const request = yield* signedRequest(body, sentAt, env.DISCORD_BOT_TOKEN);
    expect(yield* statusOf(request)).toBe(UNAUTHORIZED);
  }),
);

it.live("rejects a signed body that is not a gateway job", () =>
  Effect.gen(function* malformedEvent() {
    const now = yield* DateTime.now;
    const request = yield* signedRequest('{"kind":"withdraw"}', now, env.DISCORD_BOT_TOKEN);
    expect(yield* statusOf(request)).toBe(BAD_REQUEST);
  }),
);
