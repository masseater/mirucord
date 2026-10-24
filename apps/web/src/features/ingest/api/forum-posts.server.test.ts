import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { ChannelType } from "discord-api-types/v10";
import { Array, DateTime, Effect, pipe } from "effect";
import { http, HttpResponse } from "msw";
import { afterAll, beforeAll, expect } from "vite-plus/test";

import { createGuildKey } from "#/shared/crypto/index.server";
import { channel, db, guild, ingestConsent } from "#/shared/db/index.server";

import { putMessages, storedMessage } from "./__tests__/guild-messages";
import { forumPosts } from "./forum-posts.server";

const OWNER = "901";
const STRANGER = "902";
const GUILD = "600";
const FORUM = "601";
const QUIET_POST = "602";
const LIVELY_POST = "603";
const TEXT = "604";
const TEXT_THREAD = "605";
const DISCORD = "https://discord.com/api/v10";
const SEEDED_AT = DateTime.toDate(DateTime.makeUnsafe("2026-10-01T00:00:00Z"));

const LIVELY_MESSAGES = pipe(
  ["701", "702"],
  Array.map((id) => storedMessage({ id, channelId: LIVELY_POST })),
);

const network = setupNetwork();

const channelRow = (id: string, type: ChannelType): typeof channel.$inferInsert => ({
  id,
  guildId: GUILD,
  name: `channel ${id}`,
  type,
  permissionOverwrites: [],
});

const postRow = (id: string, parentId: string): typeof channel.$inferInsert => ({
  ...channelRow(id, ChannelType.PublicThread),
  parentId,
});

const seed = createGuildKey.pipe(
  Effect.flatMap((wrappedKey) =>
    Effect.promise(() =>
      db.batch([
        db
          .insert(guild)
          .values({ id: GUILD, name: "guild", ownerId: OWNER, wrappedKey, joinedAt: SEEDED_AT }),
        db.insert(ingestConsent).values({
          guildId: GUILD,
          grantedBy: OWNER,
          grantedAt: SEEDED_AT,
          noticeChannelId: TEXT,
        }),
        db.insert(channel).values([
          channelRow(FORUM, ChannelType.GuildForum),
          channelRow(TEXT, ChannelType.GuildText),
          postRow(QUIET_POST, FORUM),
          {
            ...postRow(LIVELY_POST, FORUM),
            newestMessageId: "702",
            backfill: "done",
          },
          postRow(TEXT_THREAD, TEXT),
        ]),
      ]),
    ),
  ),
  Effect.andThen(putMessages({ guildId: GUILD, messages: LIVELY_MESSAGES })),
);

beforeAll(() => {
  network.enable();
  network.use(
    http.get(`${DISCORD}/guilds/:guildId/members/:userId`, () => HttpResponse.json({ roles: [] })),
  );
  return Effect.runPromise(seed);
});

afterAll(() => {
  network.disable();
});

it.effect("lists the posts stored under a forum, newest first, with their messages", () =>
  Effect.gen(function* listed() {
    expect(yield* forumPosts({ guildId: GUILD, userId: OWNER, channelId: FORUM })).toStrictEqual({
      status: "ready",
      posts: [
        { id: LIVELY_POST, name: `channel ${LIVELY_POST}`, ingest: "done", messages: 2 },
        { id: QUIET_POST, name: `channel ${QUIET_POST}`, ingest: "waiting", messages: 0 },
      ],
    });
  }),
);

it.effect("refuses the posts to someone who does not manage the server", () =>
  Effect.gen(function* refused() {
    expect(yield* forumPosts({ guildId: GUILD, userId: STRANGER, channelId: FORUM })).toStrictEqual(
      { status: "forbidden" },
    );
  }),
);
