import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { env } from "cloudflare:workers";
import { DateTime, Effect } from "effect";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from "vite-plus/test";

import { createGuildKey } from "#/shared/crypto/index.server";
import { db, guild } from "#/shared/db/index.server";

import { catchUpGuild, resyncGuilds } from "./resync.server";

const BOT = "900";
const OWNER = "901";
const KEPT = "700";
const JOINED = "710";
const DEPARTED = "720";
const DISCORD = "https://discord.com/api/v10";
const DIRECT_CHANNEL = "990";
const SEEDED_AT = DateTime.toDate(DateTime.makeUnsafe("2026-10-01T00:00:00Z"));

const network = setupNetwork();

const welcomed: string[] = [];

const storedGuilds = (): Promise<readonly Readonly<{ id: string; name: string }>[]> =>
  db.select({ id: guild.id, name: guild.name }).from(guild).orderBy(guild.id);

const seedGuild = (id: string): Effect.Effect<void> =>
  createGuildKey.pipe(
    Effect.flatMap((wrappedKey) =>
      Effect.promise(() =>
        db
          .insert(guild)
          .values({ id, name: `guild ${id}`, ownerId: OWNER, wrappedKey, joinedAt: SEEDED_AT }),
      ),
    ),
    Effect.asVoid,
  );

beforeAll(() => {
  network.enable();
  return Effect.runPromise(Effect.forEach([KEPT, DEPARTED], seedGuild, { discard: true }));
});

beforeEach(() => {
  vi.spyOn(env.INGEST, "sendBatch").mockResolvedValue({
    metadata: { metrics: { backlogCount: 0, backlogBytes: 0 } },
  });
  network.use(
    http.get(`${DISCORD}/users/@me/guilds`, () =>
      HttpResponse.json([{ id: KEPT }, { id: JOINED }]),
    ),
    http.get(`${DISCORD}/users/@me`, () => HttpResponse.json({ id: BOT })),
    http.get(`${DISCORD}/guilds/:guildId/channels`, () => HttpResponse.json([])),
    http.get(`${DISCORD}/guilds/:guildId/threads/active`, () => HttpResponse.json({ threads: [] })),
    http.get(`${DISCORD}/guilds/:guildId`, ({ params }) =>
      HttpResponse.json({
        id: String(params["guildId"]),
        name: `renamed ${String(params["guildId"])}`,
        owner_id: OWNER,
        roles: [],
      }),
    ),
    http.get(`${DISCORD}/guilds/:guildId/members/${BOT}`, () => HttpResponse.json({ roles: [] })),
    http.get(`${DISCORD}/guilds/:guildId/audit-logs`, () =>
      HttpResponse.json({ audit_log_entries: [] }),
    ),
    http.post(`${DISCORD}/users/@me/channels`, () => HttpResponse.json({ id: DIRECT_CHANNEL })),
    http.post(`${DISCORD}/channels/${DIRECT_CHANNEL}/messages`, () => {
      welcomed.push(DIRECT_CHANNEL);
      return HttpResponse.json({ id: "1" });
    }),
  );
});

afterEach(() => {
  welcomed.length = 0;
  network.resetHandlers();
});

afterAll(() => {
  network.disable();
});

it.effect("a new gateway session forgets departed servers and queues a catch-up for the rest", () =>
  Effect.gen(function* resync() {
    const sendBatch = vi.spyOn(env.INGEST, "sendBatch");
    yield* resyncGuilds;
    expect(sendBatch).toHaveBeenCalledWith([
      { body: { kind: "catchUp", guildId: KEPT } },
      { body: { kind: "catchUp", guildId: JOINED } },
    ]);
    expect((yield* Effect.promise(storedGuilds)).map(({ id }) => id)).toStrictEqual([KEPT]);
  }),
);

it.effect("a catch-up stores and welcomes a server that joined while the gateway was away", () =>
  Effect.gen(function* catchUp() {
    yield* catchUpGuild(JOINED);
    expect(welcomed).toStrictEqual([DIRECT_CHANNEL]);
    expect(yield* Effect.promise(storedGuilds)).toStrictEqual([
      { id: KEPT, name: `guild ${KEPT}` },
      { id: JOINED, name: `renamed ${JOINED}` },
    ]);
  }),
);
