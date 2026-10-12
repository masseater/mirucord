import { it } from "@effect/vitest";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { DateTime, Effect, Schema } from "effect";
import type { Duration } from "effect";
import { beforeEach, expect, vi } from "vite-plus/test";

import { signGatewayEvent } from "#/features/ingest/model/gateway-signature";
import { GatewayJobSchema } from "#/features/ingest/model/ingest-job";
import { db, guild } from "#/shared/db/index.server";

import {
  consentedGuild,
  putMessages,
  storedCount,
  storedMessage,
} from "./__tests__/guild-messages";
import { receiveGatewayEvent } from "./gateway-event.server";

type GatewayEvent = Readonly<{ body: string; headers: Readonly<Record<string, string>> }>;

const PROCESSED = 200;
const NOTHING_STORED = 0;
const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const STALE_BY: Duration.Input = "10 minutes";

const encodeJson = Schema.encodeUnknownEffect(Schema.fromJsonString(GatewayJobSchema));

const JOB = { kind: "forget", guildId: "700", channelId: "710", messageIds: ["711"] } as const;

const signedRequest = (
  body: string,
  sentAt: DateTime.Utc,
  botToken: string,
): Effect.Effect<GatewayEvent> =>
  Effect.sync(() => ({
    body,
    headers: signGatewayEvent({ botToken, id: "test-event", sentAt, body }),
  }));

const statusOf = (event: GatewayEvent): Effect.Effect<number> =>
  Effect.promise(() => receiveGatewayEvent(event)).pipe(Effect.map(({ status }) => status));

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
    const event = yield* signedRequest(body, now, env.DISCORD_BOT_TOKEN);
    expect(yield* statusOf(event)).toBe(PROCESSED);
    expect(send).not.toHaveBeenCalled();
  }),
);

it.live("rejects an event signed with another token", () =>
  Effect.gen(function* forgedEvent() {
    const now = yield* DateTime.now;
    const send = vi.spyOn(env.INGEST, "send");
    const body = yield* encodeJson(JOB).pipe(Effect.orDie);
    const event = yield* signedRequest(body, now, "another-token");
    expect(yield* statusOf(event)).toBe(UNAUTHORIZED);
    expect(send).not.toHaveBeenCalled();
  }),
);

it.live("rejects a replayed event", () =>
  Effect.gen(function* staleEvent() {
    const now = yield* DateTime.now;
    const sentAt = DateTime.subtractDuration(now, STALE_BY);
    const body = yield* encodeJson(JOB).pipe(Effect.orDie);
    const event = yield* signedRequest(body, sentAt, env.DISCORD_BOT_TOKEN);
    expect(yield* statusOf(event)).toBe(UNAUTHORIZED);
  }),
);

it.live("rejects a signed body that is not a gateway job", () =>
  Effect.gen(function* malformedEvent() {
    const now = yield* DateTime.now;
    const event = yield* signedRequest('{"kind":"withdraw"}', now, env.DISCORD_BOT_TOKEN);
    expect(yield* statusOf(event)).toBe(BAD_REQUEST);
  }),
);

it.live("forgets a server as soon as the bot is removed from it", () =>
  Effect.gen(function* removedGuild() {
    const target = { guildId: "750", channelId: "751" };
    yield* consentedGuild(target);
    yield* putMessages({
      guildId: target.guildId,
      messages: [storedMessage({ id: "752", channelId: target.channelId })],
    });
    const now = yield* DateTime.now;
    const body = yield* encodeJson({ kind: "leave", guildId: target.guildId }).pipe(Effect.orDie);
    const event = yield* signedRequest(body, now, env.DISCORD_BOT_TOKEN);
    expect(yield* statusOf(event)).toBe(PROCESSED);
    expect(yield* storedCount(target.guildId)).toBe(NOTHING_STORED);
    const rows = yield* Effect.promise(() =>
      db.select({ id: guild.id }).from(guild).where(eq(guild.id, target.guildId)),
    );
    expect(rows).toStrictEqual([]);
  }),
);
