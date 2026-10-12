import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { env } from "cloudflare:workers";
import { DateTime, Effect, Option, Schema } from "effect";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from "vite-plus/test";

import { createGuildKey, openGuildKey, sealMessage } from "#/shared/crypto/index.server";
import { channel, db, guild, ingestConsent, message } from "#/shared/db/index.server";

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
const LISTED_FROM = "711";
const UNKNOWN_MESSAGE = 10_008;
const DEFAULT_TYPE = 0;
const EDITED_NEVER: string | null = Option.getOrNull(Option.none<string>());
const UNIT = 1;
const SEEDED_AT = DateTime.toDate(DateTime.makeUnsafe("2026-10-01T00:00:00Z"));
const decodeInputs = Schema.decodeUnknownEffect(
  Schema.Struct({ text: Schema.Array(Schema.String) }),
);

const SEEDED = [
  { id: FORGOTTEN, channelId: CHANNEL },
  { id: VANISHED, channelId: CHANNEL },
  { id: ELSEWHERE, channelId: OTHER_CHANNEL },
] as const;

const POSTED_MESSAGE = {
  id: POSTED,
  type: DEFAULT_TYPE,
  content: `message ${POSTED}`,
  timestamp: "2026-10-01T00:00:00Z",
  edited_timestamp: EDITED_NEVER,
  author: { id: OWNER, username: "someone" },
  attachments: [],
};

const network = setupNetwork();

const lookups: string[] = [];

const seed = Effect.gen(function* seed() {
  const wrappedKey = yield* createGuildKey;
  const key = yield* openGuildKey(wrappedKey);
  const rows = yield* Effect.all(
    SEEDED.map(({ id, channelId }) =>
      sealMessage({ authorName: "someone", content: `message ${id}`, attachments: [] }, key, {
        guildId: GUILD,
        channelId,
        messageId: id,
      }).pipe(
        Effect.map((sealed) => ({
          id,
          guildId: GUILD,
          channelId,
          authorId: OWNER,
          sealed,
          createdAt: SEEDED_AT,
        })),
      ),
    ),
  );
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
      db.insert(message).values([...rows]),
    ]),
  );
});

const storedIds = Effect.promise(() => db.select({ id: message.id }).from(message)).pipe(
  Effect.map((rows) => new Set(rows.map(({ id }) => id))),
);

beforeAll(() => {
  network.enable();
  return Effect.runPromise(seed);
});

beforeEach(() => {
  vi.spyOn(env.AI, "run").mockImplementation((_model, inputs) =>
    Effect.runPromise(
      decodeInputs(inputs).pipe(Effect.map(({ text }) => ({ data: text.map(() => [UNIT]) }))),
    ),
  );
  vi.spyOn(env.MESSAGES, "getByIds").mockResolvedValue([]);
  vi.spyOn(env.MESSAGES, "upsert").mockResolvedValue({ mutationId: "test" });
  vi.spyOn(env.MESSAGES, "deleteByIds").mockResolvedValue({ mutationId: "test" });
  network.use(
    http.get(`https://discord.com/api/v10/channels/${CHANNEL}/messages`, ({ request }) => {
      lookups.push(new URL(request.url).search);
      return HttpResponse.json([POSTED_MESSAGE]);
    }),
    http.get(`https://discord.com/api/v10/channels/${CHANNEL}/messages/${POSTED}`, () => {
      lookups.push(POSTED);
      return HttpResponse.json(POSTED_MESSAGE);
    }),
    http.get(`https://discord.com/api/v10/channels/${CHANNEL}/messages/${VANISHED}`, () => {
      lookups.push(VANISHED);
      return HttpResponse.json(
        { message: "Unknown Message", code: UNKNOWN_MESSAGE },
        { status: NOT_FOUND },
      );
    }),
  );
});

afterEach(() => {
  lookups.length = 0;
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
    expect(lookups).toStrictEqual([`?limit=100&after=${LISTED_FROM}`, VANISHED]);
  }),
);
