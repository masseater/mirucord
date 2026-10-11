import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { DateTime, Effect, Option, Schema } from "effect";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from "vite-plus/test";

import { createGuildKey, openGuildKey, openMessage } from "#/shared/crypto/index.server";
import { channel, db, guild, ingestConsent, message } from "#/shared/db/index.server";

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
const UNIT = 1;
const NONE = 0;
const PHOTO_BYTES = 100_000;
const BYTE_VALUES = 256;

const embeddedTexts: string[] = [];
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

type StoredRow = Readonly<{ sealed: string; describedWith: string | null }>;

const storedRow = (id: string): Effect.Effect<readonly StoredRow[]> =>
  Effect.promise(() =>
    db
      .select({ sealed: message.sealed, describedWith: message.describedWith })
      .from(message)
      .where(eq(message.id, id)),
  );

const guildKey: Effect.Effect<CryptoKey> = Effect.promise(() =>
  db.select({ wrappedKey: guild.wrappedKey }).from(guild).where(eq(guild.id, GUILD)),
).pipe(
  Effect.map(([row]) => Option.fromUndefinedOr(row)),
  Effect.flatMap((row) => Effect.fromOption(row).pipe(Effect.orDie)),
  Effect.flatMap(({ wrappedKey }) => openGuildKey(wrappedKey)),
);

const decodeTexts = Schema.decodeUnknownOption(
  Schema.Struct({ text: Schema.Array(Schema.String) }),
);

const answerModel = (inputs: unknown): Promise<Record<string, unknown>> =>
  Option.match(decodeTexts(inputs), {
    onNone: () => {
      modelImages.push(JSON.stringify(inputs));
      return Promise.resolve({ choices: [{ message: { content: ` ${DESCRIPTION}\n` } }] });
    },
    onSome: ({ text }) => {
      embeddedTexts.push(...text);
      return Promise.resolve({ data: text.map(() => [UNIT]) });
    },
  });

beforeAll(() => {
  network.enable();
  return Effect.runPromise(seedGuild);
});

beforeEach(() => {
  embeddedTexts.length = NONE;
  photoRequests.length = NONE;
  modelImages.length = NONE;
  vi.spyOn(env.AI, "run").mockImplementation((_model, inputs) => answerModel(inputs));
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

it.effect("indexes an image-only message by the description of its image", () =>
  Effect.gen(function* described() {
    answerWith(PHOTO, photo);
    yield* ingestChannel({ guildId: GUILD, channelId: PHOTO_CHANNEL });
    expect(embeddedTexts).toStrictEqual([DESCRIPTION]);
    expect(modelImages.join("")).toContain(expectedPhoto);
    expect(photoRequests.map(({ pathname }) => pathname)).toStrictEqual([
      new URL(PHOTO_URL).pathname,
    ]);
    const [row = { sealed: "", describedWith: "" }] = yield* storedRow(PHOTO);
    expect(row.describedWith).toBe("@cf/google/gemma-4-26b-a4b-it");
    const key = yield* guildKey;
    const body = yield* openMessage(row.sealed, key, {
      guildId: GUILD,
      channelId: PHOTO_CHANNEL,
      messageId: PHOTO,
    });
    expect(body.attachments).toStrictEqual([
      { filename: "ramen.jpg", url: PHOTO_URL, description: DESCRIPTION },
    ]);
  }),
);

it.effect("marks an image too large to describe as done without fetching it", () =>
  Effect.gen(function* large() {
    answerWith(LARGE, photo, LARGE_SIZE);
    yield* ingestChannel({ guildId: GUILD, channelId: LARGE_CHANNEL });
    expect(photoRequests).toStrictEqual([]);
    expect(embeddedTexts).toStrictEqual([]);
    const rows = yield* storedRow(LARGE);
    expect(rows.map(({ describedWith }) => describedWith)).toStrictEqual([
      "@cf/google/gemma-4-26b-a4b-it",
    ]);
  }),
);

it.live("leaves a message to be described again when its image cannot be fetched", () =>
  Effect.gen(function* broken() {
    answerWith(BROKEN, forbidden);
    yield* ingestChannel({ guildId: GUILD, channelId: BROKEN_CHANNEL });
    const undescribed = Option.getOrNull(Option.none<string>());
    const rows = yield* storedRow(BROKEN);
    expect(rows.map(({ describedWith }) => describedWith)).toStrictEqual([undescribed]);
  }),
);
