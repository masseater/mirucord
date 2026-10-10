import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { env } from "cloudflare:workers";
import { MessageType } from "discord-api-types/v10";
import { Data, DateTime, Effect, Option, Schema } from "effect";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from "vite-plus/test";

import { createGuildKey, openGuildKey, sealMessage } from "#/shared/crypto/index.server";
import { channel, db, guild, ingestConsent, message } from "#/shared/db/index.server";

import { ingestChannel } from "./ingest-channel.server";

const OWNER = "901";
const GUILD = "700";
const STORED_CHANNEL = "710";
const INDEXED = "711";
const UNINDEXED_CHANNEL = "720";
const UNINDEXED = "721";
const SEEDED_AT = DateTime.toDate(DateTime.makeUnsafe("2026-10-01T00:00:00Z"));
const UNIT = 1;
const NO_TEXT = 0;
const decodeInputs = Schema.decodeUnknownEffect(
  Schema.Struct({ text: Schema.Array(Schema.String) }),
);

const SEEDED: readonly Readonly<{ id: string; channelId: string; content: string }>[] = [
  { id: INDEXED, channelId: STORED_CHANNEL, content: `message ${INDEXED}` },
  { id: UNINDEXED, channelId: UNINDEXED_CHANNEL, content: "" },
];

class EmptyTextError extends Data.TaggedError("EmptyTextError") {}

const vectorIds = new Set<string>();

const discordMessage = (id: string): unknown => ({
  id,
  type: MessageType.Default,
  content: `message ${id}`,
  timestamp: "2026-10-01T00:00:00Z",
  edited_timestamp: Option.getOrNull(Option.none()),
  author: { id: OWNER, username: "someone" },
  attachments: [],
});

const network = setupNetwork();

const answerWith = (id: string): void => {
  network.use(
    http.get("https://discord.com/api/v10/channels/:channelId/messages", () =>
      HttpResponse.json([discordMessage(id)]),
    ),
  );
};

const sealedOf = (id: string): Effect.Effect<readonly string[]> =>
  Effect.promise(() => db.select({ id: message.id, sealed: message.sealed }).from(message)).pipe(
    Effect.map((rows) => rows.filter((row) => row.id === id).map(({ sealed }) => sealed)),
  );

const seedMessages = Effect.gen(function* seed() {
  const wrappedKey = yield* createGuildKey;
  const key = yield* openGuildKey(wrappedKey);
  const rows = yield* Effect.forEach(
    SEEDED,
    ({ id, channelId, content }) =>
      sealMessage({ authorName: "someone", content, attachments: [] }, key, {
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
    { concurrency: 1 },
  );
  yield* Effect.promise(() =>
    db.batch([
      db
        .insert(guild)
        .values({ id: GUILD, name: "guild", ownerId: OWNER, wrappedKey, joinedAt: SEEDED_AT }),
      db.insert(channel).values(
        [STORED_CHANNEL, UNINDEXED_CHANNEL].map((id) => ({
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
        noticeChannelId: STORED_CHANNEL,
      }),
      db.insert(message).values([...rows]),
    ]),
  );
});

beforeAll(() => {
  network.enable();
  return Effect.runPromise(seedMessages);
});

beforeEach(() => {
  vectorIds.clear();
  vectorIds.add(INDEXED);
  vi.spyOn(env.AI, "run").mockImplementation((_model, inputs) =>
    Effect.runPromise(
      decodeInputs(inputs).pipe(
        Effect.filterOrFail(
          ({ text }) => text.length > NO_TEXT,
          () => new EmptyTextError(),
        ),
        Effect.map(({ text }) => ({ data: text.map(() => [UNIT]) })),
      ),
    ),
  );
  vi.spyOn(env.MESSAGES, "getByIds").mockImplementation((ids) =>
    Promise.resolve(ids.filter((id) => vectorIds.has(id)).map((id) => ({ id, values: [UNIT] }))),
  );
  vi.spyOn(env.MESSAGES, "upsert").mockImplementation((vectors) => {
    for (const { id } of vectors) {
      vectorIds.add(id);
    }
    return Promise.resolve({ mutationId: "test" });
  });
});

afterEach(() => {
  network.resetHandlers();
});

afterAll(() => {
  network.disable();
});

it.effect("finishes a page whose messages are all stored already", () =>
  Effect.gen(function* storedPage() {
    const upsert = vi.spyOn(env.MESSAGES, "upsert");
    answerWith(INDEXED);
    yield* ingestChannel({ guildId: GUILD, channelId: STORED_CHANNEL });
    expect(upsert).not.toHaveBeenCalled();
    expect([...vectorIds]).toStrictEqual([INDEXED]);
  }),
);

it.effect("rewrites and indexes a stored message that has no vector yet", () =>
  Effect.gen(function* unindexedPage() {
    const before = yield* sealedOf(UNINDEXED);
    answerWith(UNINDEXED);
    yield* ingestChannel({ guildId: GUILD, channelId: UNINDEXED_CHANNEL });
    expect(vectorIds.has(UNINDEXED)).toBe(true);
    expect(yield* sealedOf(UNINDEXED)).not.toStrictEqual(before);
  }),
);
