import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { env } from "cloudflare:workers";
import { Array, DateTime, Effect } from "effect";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from "vite-plus/test";

import { createGuildKey } from "#/shared/crypto/index.server";
import { channel, db, guild, ingestConsent } from "#/shared/db/index.server";

import { refreshIngest } from "./consent-scope.server";
import { ingestChannel } from "./ingest-channel.server";

const OWNER = "901";
const AWAITING = "400";
const GRANTED = "500";
const OTHER = "600";
const AWAITING_CHANNEL = "410";
const READABLE = "510";
const HIDDEN = "520";
const OTHER_CHANNEL = "610";
const SEEDED_AT = DateTime.toDate(DateTime.makeUnsafe("2026-10-01T00:00:00Z"));

type ScenarioGuild = Readonly<{
  id: string;
  consented: boolean;
  channels: readonly Readonly<{ id: string; botAccess: "readable" | "hidden" }>[];
}>;

const GUILDS: readonly ScenarioGuild[] = [
  { id: AWAITING, consented: false, channels: [{ id: AWAITING_CHANNEL, botAccess: "readable" }] },
  {
    id: GRANTED,
    consented: true,
    channels: [
      { id: READABLE, botAccess: "readable" },
      { id: HIDDEN, botAccess: "hidden" },
    ],
  },
  { id: OTHER, consented: true, channels: [{ id: OTHER_CHANNEL, botAccess: "readable" }] },
];

const JOBS_OUTSIDE_SCOPE = [
  { guildId: AWAITING, channelId: AWAITING_CHANNEL },
  { guildId: GRANTED, channelId: HIDDEN },
  { guildId: GRANTED, channelId: OTHER_CHANNEL },
  { guildId: OTHER, channelId: READABLE },
];

const seedGuild = (seed: ScenarioGuild): Effect.Effect<void> =>
  Effect.gen(function* seedRows() {
    const wrappedKey = yield* createGuildKey;
    yield* Effect.promise(() =>
      db.batch([
        db.insert(guild).values({
          id: seed.id,
          name: `guild ${seed.id}`,
          ownerId: OWNER,
          wrappedKey,
          joinedAt: SEEDED_AT,
        }),
        db.insert(channel).values(
          seed.channels.map(({ id, botAccess }) => ({
            id,
            guildId: seed.id,
            name: `channel ${id}`,
            type: 0,
            permissionOverwrites: [],
            botAccess,
          })),
        ),
      ]),
    );
  });

const seedConsents = (): Promise<unknown> =>
  db.insert(ingestConsent).values(
    GUILDS.filter(({ consented }) => consented).map(({ id }) => ({
      guildId: id,
      grantedBy: OWNER,
      grantedAt: SEEDED_AT,
      noticeChannelId: "0",
    })),
  );

const queuedBy = (guildId: string): Effect.Effect<readonly unknown[]> =>
  Effect.gen(function* queued() {
    const sendBatch = vi.spyOn(env.INGEST, "sendBatch");
    yield* refreshIngest(guildId);
    return sendBatch.mock.calls.flatMap(([messages]) =>
      Array.fromIterable(messages).map(({ body }) => body),
    );
  });

const network = setupNetwork();

const discordPathsDuring = <Failure>(
  work: Effect.Effect<void, Failure>,
): Effect.Effect<readonly string[], Failure> =>
  Effect.gen(function* fetched() {
    const paths: string[] = [];
    network.use(
      http.all("https://discord.com/*", ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return HttpResponse.json([]);
      }),
    );
    yield* work;
    return paths;
  });

const seedScenario = Effect.forEach(GUILDS, seedGuild, { discard: true }).pipe(
  Effect.andThen(Effect.promise(seedConsents)),
);

beforeAll(() => {
  network.enable();
  return Effect.runPromise(seedScenario);
});

afterEach(() => {
  network.resetHandlers();
});

afterAll(() => {
  network.disable();
});

beforeEach(() => {
  vi.spyOn(env.AI, "run").mockResolvedValue({ data: [] });
  vi.spyOn(env.MESSAGES, "upsert").mockResolvedValue({ mutationId: "test" });
});

it.effect("queues nothing for a server that has not consented", () =>
  Effect.gen(function* awaiting() {
    expect(yield* queuedBy(AWAITING)).toStrictEqual([]);
  }),
);

it.effect("queues only the readable channels of the consenting server", () =>
  Effect.gen(function* granted() {
    expect(yield* queuedBy(GRANTED)).toStrictEqual([{ guildId: GRANTED, channelId: READABLE }]);
  }),
);

it.effect("never fetches a channel outside consent, bot access, or its own server", () =>
  Effect.gen(function* outsideScope() {
    const paths = yield* discordPathsDuring(
      Effect.forEach(JOBS_OUTSIDE_SCOPE, ingestChannel, { discard: true }),
    );
    expect(paths).toStrictEqual([]);
  }),
);

it.effect("fetches a readable channel of a consenting server", () =>
  Effect.gen(function* inScope() {
    const paths = yield* discordPathsDuring(
      ingestChannel({ guildId: GRANTED, channelId: READABLE }),
    );
    expect(paths).toStrictEqual([`/api/v10/channels/${READABLE}/messages`]);
  }),
);
