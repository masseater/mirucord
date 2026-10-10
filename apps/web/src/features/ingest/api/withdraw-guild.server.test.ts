import { it } from "@effect/vitest";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { Array, Data, DateTime, Effect, Exit, Fiber } from "effect";
import { TestClock } from "effect/testing";
import { beforeEach, expect, vi } from "vite-plus/test";

import { createGuildKey } from "#/shared/crypto/index.server";
import { channel, db, guild, ingestConsent, message } from "#/shared/db/index.server";

import { withdrawGuild } from "./withdraw-guild.server";

const OWNER = "901";
const MAX_DELETE_IDS = 100;
const STORED = 150;
const ROWS_PER_INSERT = 10;
const RETRY_WINDOW = "1 minute";
const SEEDED_AT = DateTime.toDate(DateTime.makeUnsafe("2026-10-01T00:00:00Z"));

class VectorizeRejected extends Data.TaggedError("VectorizeRejected") {}

const deletedVectors = new Set<string>();
const flaky = { failures: 0 };
const NO_FAILURE = 0;
const ONE_FAILURE = 1;

const messageIdsOf = (guildId: string): readonly string[] =>
  Array.makeBy(STORED, (index) => `${guildId}-${String(index)}`);

const seedGuild = (guildId: string): Effect.Effect<void> =>
  Effect.gen(function* seed() {
    const wrappedKey = yield* createGuildKey;
    const channelId = `${guildId}0`;
    const ids = messageIdsOf(guildId);
    yield* Effect.promise(() =>
      db.batch([
        db
          .insert(guild)
          .values({ id: guildId, name: guildId, ownerId: OWNER, wrappedKey, joinedAt: SEEDED_AT }),
        db.insert(ingestConsent).values({
          guildId,
          grantedBy: OWNER,
          grantedAt: SEEDED_AT,
          noticeChannelId: channelId,
        }),
        db.insert(channel).values({
          id: channelId,
          guildId,
          name: channelId,
          type: 0,
          permissionOverwrites: [],
        }),
      ]),
    );
    yield* Effect.forEach(
      Array.chunksOf(ids, ROWS_PER_INSERT),
      (chunk) =>
        Effect.promise(() =>
          db.insert(message).values(
            chunk.map((id) => ({
              id,
              guildId,
              channelId,
              authorId: OWNER,
              sealed: "sealed",
              createdAt: SEEDED_AT,
            })),
          ),
        ),
      { discard: true },
    );
  });

const rowsOf = (guildId: string): Effect.Effect<Readonly<{ consents: number; messages: number }>> =>
  Effect.all({
    consents: Effect.promise(() =>
      db.select().from(ingestConsent).where(eq(ingestConsent.guildId, guildId)),
    ),
    messages: Effect.promise(() => db.select().from(message).where(eq(message.guildId, guildId))),
  }).pipe(
    Effect.map(({ consents, messages }) => ({
      consents: consents.length,
      messages: messages.length,
    })),
  );

const acceptDeletes = (): void => {
  vi.spyOn(env.MESSAGES, "deleteByIds").mockImplementation((ids) => {
    if (ids.length > MAX_DELETE_IDS || flaky.failures > NO_FAILURE) {
      flaky.failures = Math.max(NO_FAILURE, flaky.failures - ONE_FAILURE);
      return Promise.reject(new VectorizeRejected());
    }
    for (const id of ids) {
      deletedVectors.add(id);
    }
    return Promise.resolve({ mutationId: "test" });
  });
};

beforeEach(() => {
  deletedVectors.clear();
  flaky.failures = NO_FAILURE;
});

it.effect("removes every message and vector before the consent goes away", () =>
  Effect.gen(function* withdrawn() {
    const guildId = "800";
    yield* seedGuild(guildId);
    acceptDeletes();
    yield* withdrawGuild(guildId);
    expect(yield* rowsOf(guildId)).toStrictEqual({ consents: 0, messages: 0 });
    expect(deletedVectors).toStrictEqual(new Set(messageIdsOf(guildId)));
  }),
);

it.effect("keeps the consent when the stored data could not be removed", () =>
  Effect.gen(function* failed() {
    const guildId = "810";
    yield* seedGuild(guildId);
    vi.spyOn(env.MESSAGES, "deleteByIds").mockRejectedValue(new VectorizeRejected());
    const fiber = yield* Effect.forkChild(Effect.exit(withdrawGuild(guildId)));
    yield* TestClock.adjust(RETRY_WINDOW);
    const exit = yield* Fiber.join(fiber);
    expect(Exit.isFailure(exit)).toBe(true);
    expect(yield* rowsOf(guildId)).toStrictEqual({ consents: 1, messages: STORED });
  }),
);

it.effect("retries a Vectorize call that fails once", () =>
  Effect.gen(function* retried() {
    const guildId = "820";
    yield* seedGuild(guildId);
    acceptDeletes();
    flaky.failures = ONE_FAILURE;
    const fiber = yield* Effect.forkChild(withdrawGuild(guildId));
    yield* TestClock.adjust(RETRY_WINDOW);
    yield* Fiber.join(fiber);
    expect(yield* rowsOf(guildId)).toStrictEqual({ consents: 0, messages: 0 });
    expect(deletedVectors).toStrictEqual(new Set(messageIdsOf(guildId)));
  }),
);
