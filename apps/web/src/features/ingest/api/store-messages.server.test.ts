import { it } from "@effect/vitest";
import { env } from "cloudflare:workers";
import { MessageType } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import { Effect, Option } from "effect";
import { afterEach, beforeAll, expect, vi } from "vite-plus/test";

import { seedGuilds } from "#/shared/__mocks__";
import { db, message } from "#/shared/db/index.server";

import { ingestChannel } from "./ingest-channel.server";

vi.mock("cloudflare:workers", () => import("#/shared/__mocks__/index.workers"));
vi.mock("#/shared/db/client.server");

const GUILD = "700";
const STORED_CHANNEL = "710";
const INDEXED = "711";
const UNINDEXED_CHANNEL = "720";
const UNINDEXED = "721";

const discordMessage = (id: string): unknown => ({
  id,
  type: MessageType.Default,
  content: `message ${id}`,
  timestamp: "2026-10-01T00:00:00Z",
  edited_timestamp: Option.getOrNull(Option.none()),
  author: { id: "901", username: "someone" },
  attachments: [],
});

const answerWith = (ids: readonly string[]): void => {
  vi.spyOn(globalThis, "fetch").mockImplementation(() =>
    Promise.resolve(Response.json(ids.map((id) => discordMessage(id)))),
  );
};

const indexed = (ids: readonly string[]): Effect.Effect<readonly string[]> =>
  Effect.promise(() => env.MESSAGES.getByIds([...ids])).pipe(
    Effect.map((found) => found.map(({ id }) => id)),
  );

const sealedOf = (id: string): Effect.Effect<readonly string[]> =>
  Effect.promise(() =>
    db.select({ sealed: message.sealed }).from(message).where(eq(message.id, id)),
  ).pipe(Effect.map((rows) => rows.map(({ sealed }) => sealed)));

beforeAll(() =>
  seedGuilds([
    {
      id: GUILD,
      ownerId: "901",
      consent: "granted",
      rolePermissions: { [GUILD]: "0" },
      channels: [
        { id: STORED_CHANNEL, botAccess: "readable", permissionOverwrites: [] },
        { id: UNINDEXED_CHANNEL, botAccess: "readable", permissionOverwrites: [] },
      ],
      messages: [
        { id: INDEXED, channelId: STORED_CHANNEL, content: `message ${INDEXED}` },
        { id: UNINDEXED, channelId: UNINDEXED_CHANNEL, content: "" },
      ],
    },
  ]),
);

afterEach(() => {
  vi.restoreAllMocks();
});

it.effect("finishes a page whose messages are all stored already", () =>
  Effect.gen(function* storedPage() {
    answerWith([INDEXED]);
    yield* ingestChannel({ guildId: GUILD, channelId: STORED_CHANNEL });
    expect(yield* indexed([INDEXED])).toStrictEqual([INDEXED]);
  }),
);

it.effect("rewrites and indexes a stored message that has no vector yet", () =>
  Effect.gen(function* unindexedPage() {
    yield* Effect.promise(() => env.MESSAGES.deleteByIds([UNINDEXED]));
    const before = yield* sealedOf(UNINDEXED);
    answerWith([UNINDEXED]);
    yield* ingestChannel({ guildId: GUILD, channelId: UNINDEXED_CHANNEL });
    expect(yield* indexed([UNINDEXED])).toStrictEqual([UNINDEXED]);
    expect(yield* sealedOf(UNINDEXED)).not.toStrictEqual(before);
  }),
);
