import { OpenFeature, TypedInMemoryProvider } from "@openfeature/server-sdk";
import { env } from "cloudflare:workers";
import { ChannelType } from "discord-api-types/v10";
import { eq, inArray } from "drizzle-orm";
import { Array, Config, ConfigProvider, DateTime, Effect, Option, pipe } from "effect";

import type { IngestJob } from "#/features/ingest/model/ingest-job";
import { createGuildKey } from "#/shared/crypto/index.server";
import { channel, db, guild, message, role } from "#/shared/db/index.server";
import {
  getGuild,
  leaveGuild,
  listActiveThreads,
  listBotGuilds,
  listGuildChannels,
} from "#/shared/discord/index.server";
import type {
  DiscordChannel,
  DiscordGuild,
  DiscordRequestError,
} from "#/shared/discord/index.server";

import { deleteVectors } from "./vectors.server";

const INGEST_FLAG = "ingest-enabled";

const flagConfiguration = {
  [INGEST_FLAG]: {
    variants: { on: true, off: false },
    defaultVariant: "on",
    disabled: false,
  },
} as const;

const ingestEnabled: Effect.Effect<boolean> = Effect.promise(() =>
  OpenFeature.setProviderAndWait(new TypedInMemoryProvider(flagConfiguration)),
).pipe(
  Effect.andThen(Effect.promise(() => OpenFeature.getClient().getBooleanValue(INGEST_FLAG, false))),
);
const QUEUE_BATCH_LIMIT = 100;
const DEFAULT_GUILD_LIMIT = 80;
const ID_CHUNK = 50;

type ChannelRow = typeof channel.$inferInsert;

const INGESTED_TYPES: ReadonlySet<number> = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.AnnouncementThread,
  ChannelType.PublicThread,
]);

const selectIds = <Row extends Readonly<{ id: string }>>(
  load: () => Promise<readonly Row[]>,
): Effect.Effect<readonly string[]> =>
  Effect.promise(load).pipe(Effect.map((rows) => rows.map(({ id }) => id)));

const MESSAGE_OWNER = { guild: message.guildId, channel: message.channelId } as const;

const forgetMessagesOf = (
  owner: keyof typeof MESSAGE_OWNER,
  ownerId: string,
): Effect.Effect<void> =>
  selectIds(() =>
    db.select({ id: message.id }).from(message).where(eq(MESSAGE_OWNER[owner], ownerId)),
  ).pipe(Effect.flatMap(deleteVectors));

const logDiscordFailure = (status: Option.Option<number>): Effect.Effect<void> =>
  Effect.logWarning("Discord request failed").pipe(
    Effect.annotateLogs({ status: Option.getOrElse(status, () => "network") }),
  );

const guildLimit: Effect.Effect<number> = Config.Int("MAX_GUILDS")
  .pipe(Config.withDefault(DEFAULT_GUILD_LIMIT))
  .parse(ConfigProvider.fromUnknown(env))
  .pipe(Effect.orDie);

const admitGuilds = (current: readonly string[]): Effect.Effect<readonly string[]> =>
  Effect.all({
    limit: guildLimit,
    stored: selectIds(() => db.select({ id: guild.id }).from(guild)),
  }).pipe(
    Effect.map(({ limit, stored }) => {
      const kept = current.filter((id) => stored.includes(id));
      const fresh = current.filter((id) => !stored.includes(id));
      return [...kept, ...Array.take(fresh, limit - kept.length)];
    }),
  );

const leaveOverLimit = (rejected: readonly string[]): Effect.Effect<void> =>
  Effect.forEach(
    rejected,
    (guildId) =>
      leaveGuild(guildId).pipe(
        Effect.andThen(Effect.logWarning("Left a server over the guild limit")),
        Effect.catchTag("DiscordRequestError", ({ status }) => logDiscordFailure(status)),
        Effect.annotateLogs({ guildId }),
      ),
    { discard: true },
  );

const removeDepartedGuilds = (current: readonly string[]): Effect.Effect<void> =>
  selectIds(() => db.select({ id: guild.id }).from(guild)).pipe(
    Effect.map((stored) => stored.filter((id) => !current.includes(id))),
    Effect.flatMap((departed) =>
      Effect.forEach(
        departed,
        (id) =>
          forgetMessagesOf("guild", id).pipe(
            Effect.andThen(Effect.promise(() => db.delete(guild).where(eq(guild.id, id)))),
          ),
        { discard: true },
      ),
    ),
  );

const upsertGuild = (discordGuild: DiscordGuild): Effect.Effect<void> =>
  Effect.all({ wrappedKey: createGuildKey, now: DateTime.now }).pipe(
    Effect.flatMap(({ wrappedKey, now }) =>
      Effect.promise(() =>
        db
          .insert(guild)
          .values({
            id: discordGuild.id,
            name: discordGuild.name,
            ownerId: discordGuild.owner_id,
            wrappedKey,
            joinedAt: DateTime.toDate(now),
          })
          .onConflictDoUpdate({
            target: guild.id,
            set: { name: discordGuild.name, ownerId: discordGuild.owner_id },
          }),
      ),
    ),
    Effect.asVoid,
  );

const replaceRoles = (discordGuild: DiscordGuild): Effect.Effect<void> =>
  Effect.asVoid(
    Effect.promise(() =>
      db.batch([
        db.delete(role).where(eq(role.guildId, discordGuild.id)),
        ...discordGuild.roles.map(({ id, permissions }) =>
          db.insert(role).values({ id, guildId: discordGuild.id, permissions }),
        ),
      ]),
    ),
  );

const toChannelRow = (guildId: string, discordChannel: DiscordChannel): ChannelRow => ({
  id: discordChannel.id,
  guildId,
  parentId: Option.getOrNull(Option.fromNullishOr(discordChannel.parent_id)),
  name: Option.getOrElse(Option.fromNullishOr(discordChannel.name), () => discordChannel.id),
  type: discordChannel.type,
  permissionOverwrites: Option.getOrElse(
    Option.fromNullishOr(discordChannel.permission_overwrites),
    Array.empty,
  ),
});

const upsertChannels = (
  guildId: string,
  channels: readonly DiscordChannel[],
): Effect.Effect<void> =>
  Effect.forEach(
    channels,
    (discordChannel) => {
      const row = toChannelRow(guildId, discordChannel);
      return Effect.promise(() =>
        db
          .insert(channel)
          .values(row)
          .onConflictDoUpdate({
            target: channel.id,
            set: {
              parentId: row.parentId,
              name: row.name,
              permissionOverwrites: row.permissionOverwrites,
            },
          }),
      );
    },
    { discard: true },
  );

const removeChannels = (guildId: string, current: readonly string[]): Effect.Effect<void> =>
  selectIds(() =>
    db.select({ id: channel.id }).from(channel).where(eq(channel.guildId, guildId)),
  ).pipe(
    Effect.map((stored) => stored.filter((id) => !current.includes(id))),
    Effect.tap((removed) =>
      Effect.forEach(removed, (id) => forgetMessagesOf("channel", id), { discard: true }),
    ),
    Effect.flatMap((removed) =>
      Effect.forEach(
        Array.chunksOf(removed, ID_CHUNK),
        (chunk) => Effect.promise(() => db.delete(channel).where(inArray(channel.id, [...chunk]))),
        { discard: true },
      ),
    ),
  );

const syncGuild = (guildId: string): Effect.Effect<readonly IngestJob[], DiscordRequestError> =>
  Effect.gen(function* sync() {
    const [discordGuild, channels, threads] = yield* Effect.all([
      getGuild(guildId),
      listGuildChannels(guildId),
      listActiveThreads(guildId),
    ]);
    const ingested = [...channels, ...threads].filter(({ type }) => INGESTED_TYPES.has(type));
    const channelIds = ingested.map(({ id }) => id);
    yield* upsertGuild(discordGuild);
    yield* replaceRoles(discordGuild);
    yield* upsertChannels(guildId, ingested);
    yield* removeChannels(guildId, channelIds);
    return channelIds.map((channelId) => ({ guildId, channelId }));
  });

const enqueue = (jobs: readonly IngestJob[]): Effect.Effect<void> =>
  Effect.forEach(
    Array.chunksOf(jobs, QUEUE_BATCH_LIMIT),
    (chunk) => Effect.promise(() => env.INGEST.sendBatch(chunk.map((body) => ({ body })))),
    { discard: true },
  );

const syncAll: Effect.Effect<void, DiscordRequestError> = Effect.gen(function* syncAll() {
  const current = (yield* listBotGuilds).map(({ id }) => id);
  const admitted = yield* admitGuilds(current);
  yield* leaveOverLimit(current.filter((id) => !admitted.includes(id)));
  yield* removeDepartedGuilds(admitted);
  const jobs = yield* pipe(
    admitted,
    Effect.forEach((id) =>
      syncGuild(id).pipe(
        Effect.catchTag("DiscordRequestError", ({ status }) =>
          logDiscordFailure(status).pipe(Effect.as([])),
        ),
      ),
    ),
  );
  yield* enqueue(jobs.flat());
});

const syncGuilds: Effect.Effect<void, DiscordRequestError> = Effect.gen(function* syncGuilds() {
  const enabled = yield* ingestEnabled;
  if (enabled) {
    yield* syncAll;
  }
});

export { guildLimit, syncGuilds };
