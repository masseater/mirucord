import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { DateTime, Effect, Option } from "effect";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, expect } from "vite-plus/test";

import { createGuildKey } from "#/shared/crypto/index.server";
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

const network = setupNetwork();

const answerWith = (id: string): void => {
  network.use(
    http.get("https://discord.com/api/v10/channels/:channelId/messages", () =>
      HttpResponse.json([discordMessage(id)]),
    ),
  );
};

const seedMessages = Effect.gen(function* seed() {
  const wrappedKey = yield* createGuildKey;
  yield* Effect.promise(() =>
    db.batch([
      db
        .insert(guild)
        .values({ id: GUILD, name: "guild", ownerId: OWNER, wrappedKey, joinedAt: SEEDED_AT }),
      db.insert(channel).values(
        [STORED_CHANNEL, UNDESCRIBED_CHANNEL].map((id) => ({
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
