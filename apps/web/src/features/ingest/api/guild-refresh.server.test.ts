import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { DateTime, Effect } from "effect";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, expect } from "vite-plus/test";

import { createGuildKey } from "#/shared/crypto/index.server";
import { db, guild } from "#/shared/db/index.server";

import { refreshGuildList, refreshManagedGuild } from "./guild-refresh.server";
import { pollGuilds } from "./sync-guilds.server";

const BOT = "900";
const OWNER = "901";
const STRANGER = "902";
const KEPT = "700";
const JOINED = "710";
const DEPARTED = "720";
const DISCORD = "https://discord.com/api/v10";
const SEEDED_AT = DateTime.toDate(DateTime.makeUnsafe("2026-10-01T00:00:00Z"));

const network = setupNetwork();

const discordGuild = (id: string): Readonly<Record<string, unknown>> => ({
  id,
  name: `renamed ${id}`,
  owner_id: OWNER,
  roles: [{ id, permissions: "0" }],
});

const discordPathsDuring = <Value, Failure>(
  work: Effect.Effect<Value, Failure>,
): Effect.Effect<Readonly<{ value: Value; paths: readonly string[] }>, Failure> =>
  Effect.gen(function* fetched() {
    const paths: string[] = [];
    network.use(
      http.all("https://discord.com/*", ({ request }) => {
        paths.push(`${request.method} ${new URL(request.url).pathname}`);
      }),
      http.get(`${DISCORD}/users/@me/guilds`, () =>
        HttpResponse.json([{ id: KEPT }, { id: JOINED }]),
      ),
      http.get(`${DISCORD}/users/@me`, () => HttpResponse.json({ id: BOT })),
      http.get(`${DISCORD}/guilds/:guildId/channels`, () => HttpResponse.json([])),
      http.get(`${DISCORD}/guilds/:guildId/threads/active`, () =>
        HttpResponse.json({ threads: [] }),
      ),
      http.get(`${DISCORD}/guilds/:guildId/members/:userId`, () =>
        HttpResponse.json({ roles: [] }),
      ),
      http.get(`${DISCORD}/guilds/:guildId`, ({ params }) =>
        HttpResponse.json(discordGuild(String(params["guildId"]))),
      ),
    );
    const value = yield* work;
    return { value, paths };
  });

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

afterEach(() => {
  network.resetHandlers();
});

afterAll(() => {
  network.disable();
});

it.effect("a list refresh stores a newly joined server and forgets a departed one", () =>
  Effect.gen(function* listRefresh() {
    const { value } = yield* discordPathsDuring(refreshGuildList);
    expect(value).toStrictEqual({ status: "refreshed" });
    expect(yield* Effect.promise(storedGuilds)).toStrictEqual([
      { id: KEPT, name: `renamed ${KEPT}` },
      { id: JOINED, name: `renamed ${JOINED}` },
    ]);
  }),
);

it.effect("a second list refresh within the cooldown asks Discord nothing", () =>
  Effect.gen(function* cooledDown() {
    const { value, paths } = yield* discordPathsDuring(refreshGuildList);
    expect(value).toStrictEqual({ status: "coolingDown" });
    expect(paths).toStrictEqual([]);
  }),
);

it.effect("the five-minute poll checks membership without listing known servers", () =>
  Effect.gen(function* poll() {
    const { paths } = yield* discordPathsDuring(pollGuilds);
    expect(paths).toStrictEqual(["GET /api/v10/users/@me/guilds", "GET /api/v10/users/@me"]);
  }),
);

it.effect("a server refresh is refused to someone who does not manage it", () =>
  Effect.gen(function* stranger() {
    const { value, paths } = yield* discordPathsDuring(
      refreshManagedGuild({ guildId: KEPT, userId: STRANGER }),
    );
    expect(value).toStrictEqual({ status: "notManaged" });
    expect(paths).not.toContain(`GET /api/v10/guilds/${KEPT}/channels`);
  }),
);

it.effect("a server refresh by its manager lists its channels once per cooldown", () =>
  Effect.gen(function* manager() {
    const first = yield* discordPathsDuring(refreshManagedGuild({ guildId: KEPT, userId: OWNER }));
    const second = yield* discordPathsDuring(refreshManagedGuild({ guildId: KEPT, userId: OWNER }));
    expect(first.value).toStrictEqual({ status: "refreshed" });
    expect(first.paths).toContain(`GET /api/v10/guilds/${KEPT}/channels`);
    expect(second.value).toStrictEqual({ status: "coolingDown" });
    expect(second.paths).not.toContain(`GET /api/v10/guilds/${KEPT}/channels`);
  }),
);
