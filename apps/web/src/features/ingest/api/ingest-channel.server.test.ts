import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { Array, Boolean, DateTime, Effect, Option, Schema } from "effect";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from "vite-plus/test";

import { createGuildKey, openGuildKey, sealMessage } from "#/shared/crypto/index.server";
import { channel, db, guild, ingestConsent, message } from "#/shared/db/index.server";

import { ingestChannel } from "./ingest-channel.server";

const OWNER = "901";
const GUILD = "700";
const CHANNEL = "710";
const CURSOR = "8000";
const DELETED = "7900";
const KEPT = "7950";
const ABOVE_CURSOR = "8500";
const LATEST_START = 90_000;
const SWEPT_START = 1000;
const UNIT = 1;
const PAGE_SIZE = 100;
const DEFAULT_TYPE = 0;
const SEEDED_AT = DateTime.toDate(DateTime.makeUnsafe("2015-01-01T00:00:00Z"));
const decodeInputs = Schema.decodeUnknownEffect(
  Schema.Struct({ text: Schema.Array(Schema.String) }),
);

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

const answer = (swept: readonly unknown[]): void => {
  network.use(
    http.get("https://discord.com/api/v10/channels/:channelId/messages", ({ request }) =>
      HttpResponse.json(
        Boolean.match(new URL(request.url).searchParams.has("before"), {
          onTrue: () => swept,
          onFalse: () => fullPage(LATEST_START),
        }),
      ),
    ),
  );
};

const seed: Effect.Effect<void> = Effect.gen(function* seedChannel() {
  const wrappedKey = yield* createGuildKey;
  const key = yield* openGuildKey(wrappedKey);
  const rows = yield* Effect.forEach([DELETED, KEPT, ABOVE_CURSOR], (id) =>
    sealMessage({ authorName: "someone", content: `message ${id}`, attachments: [] }, key, {
      guildId: GUILD,
      channelId: CHANNEL,
      messageId: id,
    }).pipe(
      Effect.map((sealed) => ({
        id,
        guildId: GUILD,
        channelId: CHANNEL,
        authorId: OWNER,
        sealed,
        createdAt: SEEDED_AT,
      })),
    ),
  );
  yield* Effect.promise(() =>
    db.batch([
      db
        .insert(guild)
        .values({ id: GUILD, name: "guild", ownerId: OWNER, wrappedKey, joinedAt: SEEDED_AT }),
      db.insert(channel).values({
        id: CHANNEL,
        guildId: GUILD,
        name: "channel",
        type: 0,
        permissionOverwrites: [],
        backfill: "done",
        sweepCursor: CURSOR,
      }),
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

const savedCursor = Effect.promise(() =>
  db.select({ sweep: channel.sweepCursor }).from(channel).where(eq(channel.id, CHANNEL)),
).pipe(Effect.map((rows) => Option.flatMapNullishOr(Array.head(rows), ({ sweep }) => sweep)));

const resetCursor = Effect.promise(() =>
  db
    .update(channel)
    .set({ sweepCursor: Option.getOrNull(Option.none()) })
    .where(eq(channel.id, CHANNEL)),
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
});

afterEach(() => {
  network.resetHandlers();
});

afterAll(() => {
  network.disable();
});

it.effect("forgets an old message deleted in Discord and restarts the sweep at the start", () =>
  Effect.gen(function* sweepToStart() {
    const deleteByIds = vi.spyOn(env.MESSAGES, "deleteByIds");
    answer([discordMessage(KEPT)]);
    yield* ingestChannel({ guildId: GUILD, channelId: CHANNEL });
    const stored = yield* storedIds;
    expect(stored.has(DELETED)).toBe(false);
    expect(stored.has(KEPT)).toBe(true);
    expect(deleteByIds).toHaveBeenCalledWith([DELETED]);
    expect(Option.isNone(yield* savedCursor)).toBe(true);
  }),
);

it.effect("moves the sweep below a full page of history", () =>
  Effect.gen(function* sweepFullPage() {
    yield* resetCursor;
    answer(fullPage(SWEPT_START));
    yield* ingestChannel({ guildId: GUILD, channelId: CHANNEL });
    expect(yield* savedCursor).toStrictEqual(Option.some(String(SWEPT_START)));
  }),
);
