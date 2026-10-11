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
const PHOTO_PROXY = "https://media.discordapp.net/attachments/830/1/ramen.jpg";
const PHOTO_WIDTH = 4000;
const PHOTO_HEIGHT = 3000;
const PHOTO_SIZE = 2_000_000;
const ORIGINAL_CHANNEL = "840";
const ORIGINAL = "841";
const SEEDED_AT = DateTime.toDate(DateTime.makeUnsafe("2026-10-01T00:00:00Z"));
const UNIT = 1;
const NONE = 0;
const ORIGINAL_BYTES = 100_000;
const BYTE_VALUES = 256;

const embeddedTexts: string[] = [];
const resizedRequests: URL[] = [];
const originalRequests: URL[] = [];
const modelImages: string[] = [];

const photoMessage = (id: string): unknown => ({
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
      proxy_url: PHOTO_PROXY,
      content_type: "image/jpeg",
      size: PHOTO_SIZE,
      width: PHOTO_WIDTH,
      height: PHOTO_HEIGHT,
    },
  ],
});

const network = setupNetwork();

const forbidden = (): Response => HttpResponse.text("forbidden", { status: FORBIDDEN });

const answerWith = (id: string, image: () => Response, original = forbidden): void => {
  network.use(
    http.get("https://discord.com/api/v10/channels/:channelId/messages", () =>
      HttpResponse.json([photoMessage(id)]),
    ),
    http.get(PHOTO_PROXY, ({ request }) => {
      resizedRequests.push(new URL(request.url));
      return image();
    }),
    http.get(PHOTO_URL, ({ request }) => {
      originalRequests.push(new URL(request.url));
      return original();
    }),
  );
};

const jpeg = (): Response =>
  HttpResponse.arrayBuffer(new Uint8Array([UNIT]).buffer, {
    headers: { "content-type": "image/jpeg" },
  });

const originalBytes = Uint8Array.from(
  { length: ORIGINAL_BYTES },
  (_value, index) => index % BYTE_VALUES,
);

const expectedOriginal = `data:image/jpeg;base64,${btoa(
  [...originalBytes].map((byte) => String.fromCodePoint(byte)).join(""),
)}`;

const largeJpeg = (): Response =>
  HttpResponse.arrayBuffer(originalBytes.buffer, { headers: { "content-type": "image/jpeg" } });

const seedGuild = Effect.gen(function* seed() {
  const wrappedKey = yield* createGuildKey;
  yield* Effect.promise(() =>
    db.batch([
      db
        .insert(guild)
        .values({ id: GUILD, name: "guild", ownerId: OWNER, wrappedKey, joinedAt: SEEDED_AT }),
      db.insert(channel).values(
        [PHOTO_CHANNEL, ORIGINAL_CHANNEL, BROKEN_CHANNEL].map((id) => ({
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
  resizedRequests.length = NONE;
  originalRequests.length = NONE;
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
    answerWith(PHOTO, jpeg);
    yield* ingestChannel({ guildId: GUILD, channelId: PHOTO_CHANNEL });
    expect(embeddedTexts).toStrictEqual([DESCRIPTION]);
    expect(
      resizedRequests.map(({ searchParams }) => [
        searchParams.get("width"),
        searchParams.get("height"),
        searchParams.get("format"),
      ]),
    ).toStrictEqual([["768", "576", "jpeg"]]);
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

it.live("falls back to the original image when the resized one is refused", () =>
  Effect.gen(function* original() {
    answerWith(ORIGINAL, forbidden, largeJpeg);
    yield* ingestChannel({ guildId: GUILD, channelId: ORIGINAL_CHANNEL });
    expect(embeddedTexts).toStrictEqual([DESCRIPTION]);
    expect(modelImages.join("")).toContain(expectedOriginal);
    expect(originalRequests.map(({ pathname }) => pathname)).toStrictEqual([
      new URL(PHOTO_URL).pathname,
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
