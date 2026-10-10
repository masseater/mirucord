import { env } from "cloudflare:workers";
import { ChannelType } from "discord-api-types/v10";
import { Array, DateTime, Effect } from "effect";

import { embed } from "#/shared/ai/index.server";
import { createGuildKey, openGuildKey, sealMessage } from "#/shared/crypto/index.server";
import { channel, db, guild, ingestConsent, message, role } from "#/shared/db/index.server";

type SeedChannel = Readonly<{
  id: string;
  botAccess: "readable" | "hidden";
  permissionOverwrites: (typeof channel.$inferInsert)["permissionOverwrites"];
}>;

type SeedMessage = Readonly<{ id: string; channelId: string; content: string }>;

type SeedGuild = Readonly<{
  id: string;
  ownerId: string;
  consent: "granted" | "awaiting";
  rolePermissions: Readonly<Record<string, string>>;
  channels: readonly SeedChannel[];
  messages: readonly SeedMessage[];
}>;

type MessageRow = typeof message.$inferInsert;

const SEEDED_AT = DateTime.toDate(DateTime.makeUnsafe("2026-10-01T00:00:00Z"));

const sealOne = (
  seed: SeedGuild,
  key: CryptoKey,
  { id, channelId, content }: SeedMessage,
): Effect.Effect<MessageRow> =>
  sealMessage({ authorName: "someone", content, attachments: [] }, key, {
    guildId: seed.id,
    channelId,
    messageId: id,
  }).pipe(
    Effect.map((sealed) => ({
      id,
      guildId: seed.id,
      channelId,
      authorId: seed.ownerId,
      sealed,
      createdAt: SEEDED_AT,
    })),
  );

const sealAll = (seed: SeedGuild, wrappedKey: string): Effect.Effect<readonly MessageRow[]> =>
  openGuildKey(wrappedKey).pipe(
    Effect.flatMap((key) =>
      Effect.forEach(seed.messages, (stored) => sealOne(seed, key, stored), { concurrency: 1 }),
    ),
  );

const indexAll = (seed: SeedGuild): Effect.Effect<void> =>
  embed(seed.messages.map(({ content }) => content)).pipe(
    Effect.map(
      Array.zipWith(seed.messages, (values, { id, channelId }) => ({
        id,
        values: [...values],
        metadata: { guildId: seed.id, channelId },
      })),
    ),
    Effect.flatMap((vectors) => Effect.promise(() => env.MESSAGES.upsert(vectors))),
    Effect.asVoid,
  );

const insertGuild = (seed: SeedGuild, wrappedKey: string): Effect.Effect<void> =>
  Effect.promise(() =>
    db.insert(guild).values({
      id: seed.id,
      name: `guild ${seed.id}`,
      ownerId: seed.ownerId,
      wrappedKey,
      joinedAt: SEEDED_AT,
    }),
  );

const insertRoles = (seed: SeedGuild): Effect.Effect<void> =>
  Effect.promise(() =>
    db.insert(role).values(
      Object.entries(seed.rolePermissions).map(([id, permissions]) => ({
        id,
        guildId: seed.id,
        permissions,
      })),
    ),
  );

const insertChannels = (seed: SeedGuild): Effect.Effect<void> =>
  Effect.promise(() =>
    db.insert(channel).values(
      seed.channels.map(({ id, botAccess, permissionOverwrites }) => ({
        id,
        guildId: seed.id,
        name: `channel ${id}`,
        type: ChannelType.GuildText,
        permissionOverwrites,
        botAccess,
      })),
    ),
  );

const insertConsent = (seed: SeedGuild): Effect.Effect<void> => {
  if (seed.consent === "awaiting") {
    return Effect.void;
  }
  return Effect.promise(() =>
    db.insert(ingestConsent).values({
      guildId: seed.id,
      grantedBy: seed.ownerId,
      grantedAt: SEEDED_AT,
      noticeChannelId: seed.id,
    }),
  );
};

const insertMessages = (seed: SeedGuild, wrappedKey: string): Effect.Effect<void> => {
  if (!Array.isReadonlyArrayNonEmpty(seed.messages)) {
    return Effect.void;
  }
  return sealAll(seed, wrappedKey).pipe(
    Effect.flatMap((rows) => Effect.promise(() => db.insert(message).values([...rows]))),
    Effect.andThen(indexAll(seed)),
  );
};

const seedGuild = (seed: SeedGuild): Effect.Effect<void> =>
  createGuildKey.pipe(
    Effect.tap((wrappedKey) => insertGuild(seed, wrappedKey)),
    Effect.tap(() => insertRoles(seed)),
    Effect.tap(() => insertChannels(seed)),
    Effect.tap(() => insertConsent(seed)),
    Effect.flatMap((wrappedKey) => insertMessages(seed, wrappedKey)),
  );

const seedGuilds = (seeds: readonly SeedGuild[]): Promise<void> =>
  Effect.runPromise(Effect.forEach(seeds, seedGuild, { discard: true }));

export { seedGuilds };
export type { SeedChannel, SeedGuild, SeedMessage };
