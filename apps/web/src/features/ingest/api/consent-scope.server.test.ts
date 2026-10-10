import { it } from "@effect/vitest";
import { env } from "cloudflare:workers";
import { Array, Effect } from "effect";
import { afterEach, beforeAll, beforeEach, expect, vi } from "vite-plus/test";

import type { IngestJob } from "#/features/ingest/model/ingest-job";
import { answerAsDiscord, fetchedPaths, seedGuilds } from "#/shared/__mocks__";
import type { SeedGuild } from "#/shared/__mocks__";

import { refreshIngest } from "./consent-scope.server";
import { ingestChannel } from "./ingest-channel.server";

vi.mock("cloudflare:workers", () => import("#/shared/__mocks__/index.workers"));
vi.mock("#/shared/db/client.server");

const AWAITING = "400";
const GRANTED = "500";
const OTHER = "600";
const AWAITING_CHANNEL = "410";
const READABLE = "510";
const HIDDEN = "520";
const OTHER_CHANNEL = "610";

const guildOf = (
  id: string,
  consent: SeedGuild["consent"],
  channels: SeedGuild["channels"],
): SeedGuild => ({
  id,
  ownerId: "901",
  consent,
  rolePermissions: { [id]: "0" },
  channels,
  messages: [],
});

const GUILDS: readonly SeedGuild[] = [
  guildOf(AWAITING, "awaiting", [
    { id: AWAITING_CHANNEL, botAccess: "readable", permissionOverwrites: [] },
  ]),
  guildOf(GRANTED, "granted", [
    { id: READABLE, botAccess: "readable", permissionOverwrites: [] },
    { id: HIDDEN, botAccess: "hidden", permissionOverwrites: [] },
  ]),
  guildOf(OTHER, "granted", [
    { id: OTHER_CHANNEL, botAccess: "readable", permissionOverwrites: [] },
  ]),
];

const JOBS_OUTSIDE_SCOPE: readonly IngestJob[] = [
  { guildId: AWAITING, channelId: AWAITING_CHANNEL },
  { guildId: GRANTED, channelId: HIDDEN },
  { guildId: GRANTED, channelId: OTHER_CHANNEL },
  { guildId: OTHER, channelId: READABLE },
];

const queuedBy = (guildId: string): Effect.Effect<readonly unknown[]> =>
  Effect.gen(function* queued() {
    const sendBatch = vi.spyOn(env.INGEST, "sendBatch");
    yield* refreshIngest(guildId);
    return sendBatch.mock.calls.flatMap(([messages]) =>
      Array.fromIterable(messages).map(({ body }) => body),
    );
  });

const discordPathsDuring = <Failure>(
  work: Effect.Effect<void, Failure>,
): Effect.Effect<readonly string[], Failure> =>
  Effect.gen(function* fetched() {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) =>
        Promise.resolve(answerAsDiscord({ url: new Request(input).url, memberships: {} })),
      );
    yield* work;
    return fetchedPaths(fetch.mock.calls);
  });

beforeAll(() => seedGuilds(GUILDS));

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
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
