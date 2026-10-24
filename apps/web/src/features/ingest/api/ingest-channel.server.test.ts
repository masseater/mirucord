import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { Array, DateTime, Effect, Option, pipe } from "effect";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, expect, vi } from "vite-plus/test";

import { channel, db } from "#/shared/db/index.server";

import {
  consentedGuild,
  putMessages,
  storedIdsIn,
  storedMessage,
} from "./__tests__/guild-messages";
import { ingestChannel } from "./ingest-channel.server";

const OWNER = "901";
const GUILD = "700";
const CHANNEL = "710";
const DELETED = "7900";
const KEPT = "7950";
const LATEST_START = 90_000;
const UNIT = 1;
const PAGE_SIZE = 100;
const DEFAULT_TYPE = 0;
const SEEDED_AT = DateTime.toDate(DateTime.makeUnsafe("2015-01-01T00:00:00Z"));

const discordMessage = (id: string): unknown => ({
  id,
  type: DEFAULT_TYPE,
  content: `message ${id}`,
  timestamp: "2026-10-01T00:00:00Z",
  edited_timestamp: Option.getOrNull(Option.none()),
  author: { id: OWNER, username: "someone" },
  attachments: [],
});

const fullPage = (start: number): readonly unknown[] =>
  Array.makeBy(PAGE_SIZE, (offset) => discordMessage(String(start + offset)));

const network = setupNetwork();

const seed: Effect.Effect<void> = Effect.gen(function* seedChannel() {
  yield* consentedGuild({ guildId: GUILD, channelId: CHANNEL });
  yield* Effect.promise(() =>
    db.insert(channel).values({
      id: CHANNEL,
      guildId: GUILD,
      name: "channel",
      type: 0,
      permissionOverwrites: [],
      backfill: "done",
    }),
  );
  const messages = pipe(
    [DELETED, KEPT],
    Array.map((id) => storedMessage({ id, channelId: CHANNEL, createdAt: SEEDED_AT.getTime() })),
  );
  yield* putMessages({ guildId: GUILD, messages });
});

const storedIds = storedIdsIn({ guildId: GUILD, channelId: CHANNEL }).pipe(
  Effect.map((ids) => new Set(ids)),
);

beforeAll(() => {
  network.enable();
  return Effect.runPromise(seed);
});

afterEach(() => {
  network.resetHandlers();
});

afterAll(() => {
  network.disable();
});

it.effect("forgets a stored message missing from a channel's whole latest history", () =>
  Effect.gen(function* forgetMissing() {
    network.use(
      http.get("https://discord.com/api/v10/channels/:channelId/messages", () =>
        HttpResponse.json([discordMessage(KEPT)]),
      ),
    );
    yield* ingestChannel({ guildId: GUILD, channelId: CHANNEL });
    const stored = yield* storedIds;
    expect(stored.has(DELETED)).toBe(false);
    expect(stored.has(KEPT)).toBe(true);
  }),
);

const BACKFILLING = "720";
const BACKFILL_CURSOR = "60000";
const OLDER_START = 50_000;
const BACKFILL_PAGES = 5;
const STALE_CURSOR = String(OLDER_START - PAGE_SIZE * (BACKFILL_PAGES - UNIT));

const seedBackfilling = Effect.promise(() =>
  db.insert(channel).values({
    id: BACKFILLING,
    guildId: GUILD,
    name: "backfilling",
    type: 0,
    permissionOverwrites: [],
    newestMessageId: String(LATEST_START),
    oldestMessageId: BACKFILL_CURSOR,
    backfill: "pending",
  }),
);

const answerHistory = (): void => {
  network.use(
    http.get("https://discord.com/api/v10/channels/:channelId/messages", ({ request }) => {
      const before = new URL(request.url).searchParams.get("before");
      return HttpResponse.json(
        Option.match(Option.fromNullOr(before), {
          onNone: () => fullPage(LATEST_START),
          onSome: (cursor) => fullPage(Math.min(Number(cursor), OLDER_START) - PAGE_SIZE),
        }),
      );
    }),
  );
};

const savedOldest = Effect.promise(() =>
  db.select({ oldest: channel.oldestMessageId }).from(channel).where(eq(channel.id, BACKFILLING)),
).pipe(Effect.map((rows) => Option.flatMapNullishOr(Array.head(rows), ({ oldest }) => oldest)));

it.effect("queues the next run of a channel whose history is still pending", () =>
  Effect.gen(function* chainBackfill() {
    yield* seedBackfilling;
    answerHistory();
    const sendBatch = vi.spyOn(env.INGEST, "sendBatch");
    yield* ingestChannel({ guildId: GUILD, channelId: BACKFILLING });
    const oldest = yield* savedOldest;
    expect(Option.isSome(oldest)).toBe(true);
    expect(sendBatch).toHaveBeenCalledWith([
      {
        body: {
          guildId: GUILD,
          channelId: BACKFILLING,
          resumeBefore: Option.getOrThrow(oldest),
        },
      },
    ]);
  }),
);

it.effect("drops a queued run whose history was already advanced by another run", () =>
  Effect.gen(function* dropSuperseded() {
    answerHistory();
    const before = yield* savedOldest;
    const sendBatch = vi.spyOn(env.INGEST, "sendBatch");
    yield* ingestChannel({ guildId: GUILD, channelId: BACKFILLING, resumeBefore: STALE_CURSOR });
    expect(yield* savedOldest).toStrictEqual(before);
    expect(sendBatch).not.toHaveBeenCalled();
  }),
);
