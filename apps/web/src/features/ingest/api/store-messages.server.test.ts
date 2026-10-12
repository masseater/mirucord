import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { eq } from "drizzle-orm";
import { Array, DateTime, Effect, Option } from "effect";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, expect } from "vite-plus/test";

import { createGuildKey, openGuildKeys, openMessage } from "#/shared/crypto/index.server";
import type { MessageBody } from "#/shared/crypto/index.server";
import { channel, db, guild, ingestConsent } from "#/shared/db/index.server";

import { putMessages, sealedIn, storedMessage } from "./__tests__/guild-messages";
import { ingestChannel } from "./ingest-channel.server";

const DEFAULT_MESSAGE = 0;
const DESCRIBED_WITH = "test-model";
const OWNER = "901";
const GUILD = "700";
const STORED_CHANNEL = "710";
const STORED = "711";
const UNDESCRIBED_CHANNEL = "740";
const UNDESCRIBED = "741";
const FORWARD_CHANNEL = "750";
const FORWARD = "751";
const FORWARDED_TEXT = "麺のことを綿と呼んでいる";
const RICH_CHANNEL = "760";
const RICH = "761";
const SEEDED_AT = DateTime.toDate(DateTime.makeUnsafe("2026-10-01T00:00:00Z"));

const discordMessage = (id: string): unknown => ({
  id,
  type: DEFAULT_MESSAGE,
  content: `message ${id}`,
  timestamp: "2026-10-01T00:00:00Z",
  edited_timestamp: Option.getOrNull(Option.none()),
  author: { id: OWNER, username: "someone" },
  attachments: [],
});

const forwardMessage = (id: string): unknown => ({
  id,
  type: DEFAULT_MESSAGE,
  content: "",
  timestamp: "2026-10-01T00:00:00Z",
  edited_timestamp: Option.getOrNull(Option.none()),
  author: { id: OWNER, username: "someone" },
  attachments: [],
  message_snapshots: [{ message: { content: FORWARDED_TEXT, attachments: [] } }],
});

const richMessage = (id: string): unknown => ({
  id,
  type: DEFAULT_MESSAGE,
  content: "",
  timestamp: "2026-10-01T00:00:00Z",
  edited_timestamp: Option.getOrNull(Option.none()),
  author: { id: OWNER, username: "someone" },
  attachments: [],
  embeds: [{ title: "埋め込みの題", fields: [{ name: "項目", value: "値" }] }],
  sticker_items: [{ id: "1", name: "おじぎ", format_type: 1 }],
  poll: {
    question: { text: "どれにする" },
    answers: [{ answer_id: 1, poll_media: { text: "ラーメン" } }],
  },
});

const network = setupNetwork();

const answerWith = (id: string, message = discordMessage): void => {
  network.use(
    http.get("https://discord.com/api/v10/channels/:channelId/messages", () =>
      HttpResponse.json([message(id)]),
    ),
  );
};

const bodyIn = (channelId: string, messageId: string): Effect.Effect<MessageBody> =>
  Effect.gen(function* opened() {
    const rows = yield* Effect.promise(() =>
      db.select({ wrappedKey: guild.wrappedKey }).from(guild).where(eq(guild.id, GUILD)),
    );
    const { wrappedKey } = yield* Effect.fromOption(Array.head(rows)).pipe(Effect.orDie);
    const { key } = yield* openGuildKeys(wrappedKey);
    const [sealed = ""] = yield* sealedIn({ guildId: GUILD, channelId });
    return yield* openMessage(sealed, key, { guildId: GUILD, channelId, messageId });
  });

const seedMessages = Effect.gen(function* seed() {
  const wrappedKey = yield* createGuildKey;
  yield* Effect.promise(() =>
    db.batch([
      db
        .insert(guild)
        .values({ id: GUILD, name: "guild", ownerId: OWNER, wrappedKey, joinedAt: SEEDED_AT }),
      db.insert(channel).values(
        [STORED_CHANNEL, UNDESCRIBED_CHANNEL, FORWARD_CHANNEL, RICH_CHANNEL].map((id) => ({
          id,
          guildId: GUILD,
          name: `channel ${id}`,
          type: 0,
          permissionOverwrites: [],
        })),
      ),
      db.insert(ingestConsent).values({
        guildId: GUILD,
        grantedBy: OWNER,
        grantedAt: SEEDED_AT,
        noticeChannelId: STORED_CHANNEL,
      }),
    ]),
  );
  const messages = [
    storedMessage({ id: STORED, channelId: STORED_CHANNEL, describedWith: DESCRIBED_WITH }),
    storedMessage({ id: UNDESCRIBED, channelId: UNDESCRIBED_CHANNEL }),
    storedMessage({ id: FORWARD, channelId: FORWARD_CHANNEL, describedWith: DESCRIBED_WITH }),
  ];
  yield* putMessages({ guildId: GUILD, messages });
});

beforeAll(() => {
  network.enable();
  return Effect.runPromise(seedMessages);
});

afterEach(() => {
  network.resetHandlers();
});

afterAll(() => {
  network.disable();
});

it.effect("leaves a stored message alone when Discord reports no change", () =>
  Effect.gen(function* storedPage() {
    const before = yield* sealedIn({ guildId: GUILD, channelId: STORED_CHANNEL });
    answerWith(STORED);
    yield* ingestChannel({ guildId: GUILD, channelId: STORED_CHANNEL });
    expect(yield* sealedIn({ guildId: GUILD, channelId: STORED_CHANNEL })).toStrictEqual(before);
  }),
);

it.effect("rewrites a stored message that was not described with the current model", () =>
  Effect.gen(function* undescribedPage() {
    const before = yield* sealedIn({ guildId: GUILD, channelId: UNDESCRIBED_CHANNEL });
    answerWith(UNDESCRIBED);
    yield* ingestChannel({ guildId: GUILD, channelId: UNDESCRIBED_CHANNEL });
    expect(yield* sealedIn({ guildId: GUILD, channelId: UNDESCRIBED_CHANNEL })).not.toStrictEqual(
      before,
    );
  }),
);

it.effect("stores the text of a forwarded message stored before forwards were read", () =>
  Effect.gen(function* forwardedPage() {
    answerWith(FORWARD, forwardMessage);
    yield* ingestChannel({ guildId: GUILD, channelId: FORWARD_CHANNEL });
    expect((yield* bodyIn(FORWARD_CHANNEL, FORWARD)).content).toBe(FORWARDED_TEXT);
  }),
);

it.effect("stores embeds, sticker names and the poll of a message", () =>
  Effect.gen(function* richPage() {
    answerWith(RICH, richMessage);
    yield* ingestChannel({ guildId: GUILD, channelId: RICH_CHANNEL });
    const { embeds, stickers, poll } = yield* bodyIn(RICH_CHANNEL, RICH);
    expect({ embeds, stickers, poll }).toStrictEqual({
      embeds: [{ title: "埋め込みの題", fields: [{ name: "項目", value: "値" }] }],
      stickers: ["おじぎ"],
      poll: { question: "どれにする", answers: ["ラーメン"] },
    });
  }),
);
