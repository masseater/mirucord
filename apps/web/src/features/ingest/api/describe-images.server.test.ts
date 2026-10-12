import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { env } from "cloudflare:workers";
import { DateTime, Effect, Option } from "effect";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from "vite-plus/test";

import { createGuildKey, openGuildKeys, openMessage } from "#/shared/crypto/index.server";
import { channel, db, guild, ingestConsent } from "#/shared/db/index.server";

import { candidateIds, describedWithOf, sealedIn } from "./__tests__/guild-messages";
import { ingestChannel } from "./ingest-channel.server";

const DEFAULT_MESSAGE = 0;
const OWNER = "901";
const GUILD = "800";
const PHOTO_CHANNEL = "830";
const PHOTO = "831";
const BROKEN_CHANNEL = "850";
const BROKEN = "851";
const FORBIDDEN = 403;
const DESCRIPTION = "ラーメンの写真";
const PHOTO_URL = "https://cdn.discordapp.com/attachments/830/1/ramen.jpg";
const PHOTO_SIZE = 2_000_000;
const LARGE_SIZE = 5_000_000;
const LARGE_CHANNEL = "840";
const LARGE = "841";
const SEEDED_AT = DateTime.toDate(DateTime.makeUnsafe("2026-10-01T00:00:00Z"));
const NONE = 0;
const PHOTO_BYTES = 100_000;
const BYTE_VALUES = 256;

const photoRequests: URL[] = [];
const modelImages: string[] = [];

const photoMessage = (id: string, size: number): unknown => ({
  id,
  type: DEFAULT_MESSAGE,
  content: "",
  timestamp: "2026-10-01T00:00:00Z",
  edited_timestamp: Option.getOrNull(Option.none()),
  author: { id: OWNER, username: "someone" },
  attachments: [
    {
      filename: "ramen.jpg",
      url: PHOTO_URL,
      content_type: "image/jpeg",
      size,
    },
  ],
});

const network = setupNetwork();

const forbidden = (): Response => HttpResponse.text("forbidden", { status: FORBIDDEN });

const answerWith = (id: string, image: () => Response, size = PHOTO_SIZE): void => {
  network.use(
    http.get("https://discord.com/api/v10/channels/:channelId/messages", () =>
      HttpResponse.json([photoMessage(id, size)]),
    ),
    http.get(PHOTO_URL, ({ request }) => {
      photoRequests.push(new URL(request.url));
      return image();
    }),
  );
};

const photoBytes = Uint8Array.from({ length: PHOTO_BYTES }, (_value, index) => index % BYTE_VALUES);

const expectedPhoto = `data:image/jpeg;base64,${btoa(
  [...photoBytes].map((byte) => String.fromCodePoint(byte)).join(""),
)}`;

const photo = (): Response =>
  HttpResponse.arrayBuffer(photoBytes.buffer, { headers: { "content-type": "image/jpeg" } });

const seedGuild = Effect.gen(function* seed() {
  const wrappedKey = yield* createGuildKey;
  yield* Effect.promise(() =>
    db.batch([
      db
        .insert(guild)
        .values({ id: GUILD, name: "guild", ownerId: OWNER, wrappedKey, joinedAt: SEEDED_AT }),
      db.insert(channel).values(
        [PHOTO_CHANNEL, LARGE_CHANNEL, BROKEN_CHANNEL].map((id) => ({
          id,
          guildId: GUILD,
          name: `channel ${id}`,
          type: DEFAULT_MESSAGE,
          permissionOverwrites: [],
        })),
      ),
      db.insert(ingestConsent).values({
        guildId: GUILD,
        grantedBy: OWNER,
        grantedAt: SEEDED_AT,
        noticeChannelId: PHOTO_CHANNEL,
      }),
    ]),
  );
});

const guildKeys = Effect.promise(() =>
  db.select({ wrappedKey: guild.wrappedKey }).from(guild),
).pipe(
  Effect.map(([row]) => Option.fromUndefinedOr(row)),
  Effect.flatMap((row) => Effect.fromOption(row).pipe(Effect.orDie)),
  Effect.flatMap(({ wrappedKey }) => openGuildKeys(wrappedKey)),
);

const photoFoundBy = (query: string): Effect.Effect<readonly string[]> =>
  guildKeys.pipe(
    Effect.flatMap(({ searchKey }) =>
      candidateIds({ guildId: GUILD, channelId: PHOTO_CHANNEL, searchKey, query }),
    ),
  );

const photoAttachments = Effect.gen(function* opened() {
  const { key } = yield* guildKeys;
  const [sealed = ""] = yield* sealedIn({ guildId: GUILD, channelId: PHOTO_CHANNEL });
  const body = yield* openMessage(sealed, key, {
    guildId: GUILD,
    channelId: PHOTO_CHANNEL,
    messageId: PHOTO,
  });
  return body.attachments;
});

const answerModel = (inputs: unknown): Promise<Record<string, unknown>> => {
  modelImages.push(JSON.stringify(inputs));
  return Promise.resolve({ choices: [{ message: { content: ` ${DESCRIPTION}\n` } }] });
};

beforeAll(() => {
  network.enable();
  return Effect.runPromise(seedGuild);
});

beforeEach(() => {
  photoRequests.length = NONE;
  modelImages.length = NONE;
  vi.spyOn(env.AI, "run").mockImplementation((_model, inputs) => answerModel(inputs));
});

afterEach(() => {
  network.resetHandlers();
});

afterAll(() => {
  network.disable();
});

it.effect("indexes an image-only message by the description of its image", () =>
  Effect.gen(function* described() {
    answerWith(PHOTO, photo);
    yield* ingestChannel({ guildId: GUILD, channelId: PHOTO_CHANNEL });
    expect(modelImages.join("")).toContain(expectedPhoto);
    expect(photoRequests.map(({ pathname }) => pathname)).toStrictEqual([
      new URL(PHOTO_URL).pathname,
    ]);
    expect(yield* describedWithOf({ guildId: GUILD, id: PHOTO })).toStrictEqual([
      "@cf/google/gemma-4-26b-a4b-it",
    ]);
    expect(yield* photoFoundBy("ラーメン")).toStrictEqual([PHOTO]);
    expect(yield* photoAttachments).toStrictEqual([
      { filename: "ramen.jpg", url: PHOTO_URL, description: DESCRIPTION },
    ]);
  }),
);

it.effect("marks an image too large to describe as done without fetching it", () =>
  Effect.gen(function* large() {
    answerWith(LARGE, photo, LARGE_SIZE);
    yield* ingestChannel({ guildId: GUILD, channelId: LARGE_CHANNEL });
    expect(photoRequests).toStrictEqual([]);
    expect(yield* describedWithOf({ guildId: GUILD, id: LARGE })).toStrictEqual([
      "@cf/google/gemma-4-26b-a4b-it",
    ]);
  }),
);

it.live("leaves a message to be described again when its image cannot be fetched", () =>
  Effect.gen(function* broken() {
    answerWith(BROKEN, forbidden);
    yield* ingestChannel({ guildId: GUILD, channelId: BROKEN_CHANNEL });
    const undescribed = Option.getOrNull(Option.none<string>());
    expect(yield* describedWithOf({ guildId: GUILD, id: BROKEN })).toStrictEqual([undescribed]);
  }),
);
