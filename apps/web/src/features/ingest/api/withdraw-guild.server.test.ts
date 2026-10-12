import { it } from "@effect/vitest";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { Array, DateTime, Effect, Exit } from "effect";
import { beforeEach, expect, vi } from "vite-plus/test";

import { createGuildKey } from "#/shared/crypto/index.server";
import { channel, db, guild, ingestConsent } from "#/shared/db/index.server";

import { putMessages, storedCount, storedMessage } from "./__tests__/guild-messages";
import { ingestDeliveries } from "./ingest-queue.server";
import { requestWithdrawal, withdrawGuild } from "./withdraw-guild.server";

const OWNER = "901";
const STORED = 150;
const SEEDED_AT = DateTime.toDate(DateTime.makeUnsafe("2026-10-01T00:00:00Z"));

const FIRST_ATTEMPT = 1;
const LAST_ATTEMPT = 6;
const handled = { acked: 0, retried: 0 };
const ONCE = 1;
const NEVER = 0;

const seedGuild = (guildId: string): Effect.Effect<void> =>
  Effect.gen(function* seed() {
    const wrappedKey = yield* createGuildKey;
    const channelId = `${guildId}0`;
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
    const messages = Array.makeBy(STORED, (index) =>
      storedMessage({ id: `${guildId}${String(index)}`, channelId }),
    );
    yield* putMessages({ guildId, messages });
  });

const rowsOf = (guildId: string): Effect.Effect<Readonly<{ consents: number; messages: number }>> =>
  Effect.all({
    consents: Effect.promise(() =>
      db.select().from(ingestConsent).where(eq(ingestConsent.guildId, guildId)),
    ),
    messages: storedCount(guildId),
  }).pipe(
    Effect.map(({ consents, messages }) => ({
      consents: consents.length,
      messages,
    })),
  );

const breakGuildStore = (): void => {
  vi.spyOn(env.GUILD_STORE, "getByName").mockImplementation(() => {
    throw new Error("guild store unavailable");
  });
};

const stateOf = (guildId: string): Effect.Effect<readonly string[]> =>
  Effect.promise(() =>
    db
      .select({ state: ingestConsent.state })
      .from(ingestConsent)
      .where(eq(ingestConsent.guildId, guildId)),
  ).pipe(Effect.map((rows) => rows.map(({ state }) => state)));

const deliverWithdrawal = (guildId: string, attempts: number): Effect.Effect<void> =>
  ingestDeliveries([
    {
      body: { kind: "withdraw", guildId },
      attempts,
      ack: () => {
        handled.acked += ONCE;
      },
      retry: () => {
        handled.retried += ONCE;
      },
    },
  ]);

beforeEach(() => {
  handled.acked = NEVER;
  handled.retried = NEVER;
});

it.effect("removes every message before the consent goes away", () =>
  Effect.gen(function* withdrawn() {
    const guildId = "800";
    yield* seedGuild(guildId);
    yield* withdrawGuild(guildId);
    expect(yield* rowsOf(guildId)).toStrictEqual({ consents: 0, messages: 0 });
  }),
);

it.effect("keeps the consent when the stored data could not be removed", () =>
  Effect.gen(function* failed() {
    const guildId = "810";
    yield* seedGuild(guildId);
    breakGuildStore();
    const exit = yield* Effect.exit(withdrawGuild(guildId));
    vi.restoreAllMocks();
    expect(Exit.isFailure(exit)).toBe(true);
    expect(yield* rowsOf(guildId)).toStrictEqual({ consents: 1, messages: STORED });
  }),
);

it.effect("marks the consent as withdrawing and queues the deletion", () =>
  Effect.gen(function* requested() {
    const guildId = "830";
    yield* seedGuild(guildId);
    const send = vi.spyOn(env.INGEST, "send");
    yield* requestWithdrawal(guildId);
    expect(yield* stateOf(guildId)).toStrictEqual(["withdrawing"]);
    expect(send).toHaveBeenCalledWith({ kind: "withdraw", guildId });
    expect(yield* rowsOf(guildId)).toStrictEqual({ consents: 1, messages: STORED });
  }),
);

it.effect("deletes everything when the queued withdrawal runs", () =>
  Effect.gen(function* queued() {
    const guildId = "840";
    yield* seedGuild(guildId);
    yield* requestWithdrawal(guildId);
    yield* deliverWithdrawal(guildId, FIRST_ATTEMPT);
    expect(handled).toStrictEqual({ acked: ONCE, retried: NEVER });
    expect(yield* rowsOf(guildId)).toStrictEqual({ consents: 0, messages: 0 });
  }),
);

it.effect("gives the consent back when the queued withdrawal keeps failing", () =>
  Effect.gen(function* abandoned() {
    const guildId = "850";
    yield* seedGuild(guildId);
    yield* requestWithdrawal(guildId);
    breakGuildStore();
    yield* deliverWithdrawal(guildId, LAST_ATTEMPT);
    vi.restoreAllMocks();
    expect(handled).toStrictEqual({ acked: NEVER, retried: ONCE });
    expect(yield* stateOf(guildId)).toStrictEqual(["granted"]);
    expect(yield* rowsOf(guildId)).toStrictEqual({ consents: 1, messages: STORED });
  }),
);
