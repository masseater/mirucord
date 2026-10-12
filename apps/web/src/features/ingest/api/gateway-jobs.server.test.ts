import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { DateTime, Effect, Option } from "effect";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, expect } from "vite-plus/test";

import { createGuildKey } from "#/shared/crypto/index.server";
import { channel, db, guild, ingestConsent } from "#/shared/db/index.server";

import { putMessages, storedIdsIn, storedMessage } from "./__tests__/guild-messages";
import { forgetMessages, refreshMessages } from "./gateway-jobs.server";

const OWNER = "901";
const GUILD = "700";
const CHANNEL = "710";
const OTHER_CHANNEL = "720";
const FORGOTTEN = "711";
const VANISHED = "712";
const POSTED = "713";
const ELSEWHERE = "721";
const NOT_FOUND = 404;
const UNKNOWN_MESSAGE = 10_008;
const DEFAULT_TYPE = 0;
const EDITED_NEVER: string | null = Option.getOrNull(Option.none<string>());
const SEEDED_AT = DateTime.toDate(DateTime.makeUnsafe("2026-10-01T00:00:00Z"));

const SEEDED = [
  { id: FORGOTTEN, channelId: CHANNEL },
  { id: VANISHED, channelId: CHANNEL },
  { id: ELSEWHERE, channelId: OTHER_CHANNEL },
] as const;

const network = setupNetwork();

const seed = Effect.gen(function* seed() {
  const wrappedKey = yield* createGuildKey;
  yield* Effect.promise(() =>
    db.batch([
      db
        .insert(guild)
        .values({ id: GUILD, name: "guild", ownerId: OWNER, wrappedKey, joinedAt: SEEDED_AT }),
      db.insert(channel).values(
        [CHANNEL, OTHER_CHANNEL].map((id) => ({
          id,
          guildId: GUILD,
          name: `channel ${id}`,
          type: 0,
          permissionOverwrites: [],
        })),
      ),
      db.insert(ingestConsent).values({
        guildId: GUILD,
        grantedBy: OWNER,
        grantedAt: SEEDED_AT,
        noticeChannelId: CHANNEL,
      }),
    ]),
  );
  yield* putMessages({ guildId: GUILD, messages: SEEDED.map((row) => storedMessage(row)) });
});

const storedIds = Effect.forEach([CHANNEL, OTHER_CHANNEL], (channelId) =>
  storedIdsIn({ guildId: GUILD, channelId }),
).pipe(Effect.map((channels) => new Set(channels.flat())));

beforeAll(() => {
  network.enable();
  return Effect.runPromise(seed);
});

beforeEach(() => {
  network.use(
    http.get(`https://discord.com/api/v10/channels/${CHANNEL}/messages/${POSTED}`, () =>
      HttpResponse.json({
        id: POSTED,
        type: DEFAULT_TYPE,
        content: `message ${POSTED}`,
        timestamp: "2026-10-01T00:00:00Z",
        edited_timestamp: EDITED_NEVER,
        author: { id: OWNER, username: "someone" },
        attachments: [],
      }),
    ),
    http.get(`https://discord.com/api/v10/channels/${CHANNEL}/messages/${VANISHED}`, () =>
      HttpResponse.json(
        { message: "Unknown Message", code: UNKNOWN_MESSAGE },
        { status: NOT_FOUND },
      ),
    ),
  );
});

afterEach(() => {
  network.resetHandlers();
});

afterAll(() => {
  network.disable();
});

it.effect("forgets deleted messages only in the channel the event names", () =>
  Effect.gen(function* forget() {
    yield* forgetMessages({
      kind: "forget",
      guildId: GUILD,
      channelId: CHANNEL,
      messageIds: [FORGOTTEN, ELSEWHERE],
    });
    const stored = yield* storedIds;
    expect(stored.has(FORGOTTEN)).toBe(false);
    expect(stored.has(ELSEWHERE)).toBe(true);
  }),
);

it.effect("stores a refreshed message and forgets one Discord no longer has", () =>
  Effect.gen(function* refresh() {
    yield* refreshMessages({
      kind: "refresh",
      guildId: GUILD,
      channelId: CHANNEL,
      messageIds: [POSTED, VANISHED],
    });
    const stored = yield* storedIds;
    expect(stored.has(POSTED)).toBe(true);
    expect(stored.has(VANISHED)).toBe(false);
  }),
);
