import { eq } from "drizzle-orm";
import { Array, Boolean, DateTime, Effect, Option } from "effect";

import { observeAccess } from "#/features/ingest/model/bot-access";
import type { BotAccess } from "#/features/ingest/model/bot-access";
import { channel, db } from "#/shared/db/index.server";
import type { DiscordChannel } from "#/shared/discord/index.server";

import { accessOf, columnsOf } from "./bot-access.server";
import type { ChannelSync } from "./channel-listing.server";
import { refreshIngest } from "./consent-scope.server";
import { settleStoredChannels } from "./settle-channels.server";

type ChannelRow = typeof channel.$inferInsert;

const FIRST_POSITION = 0;
const READABLE: BotAccess = { status: "readable" };

const toChannelRow = (
  { discordGuild, archived }: ChannelSync,
  discordChannel: DiscordChannel,
): ChannelRow => ({
  id: discordChannel.id,
  guildId: discordGuild.id,
  parentId: Option.getOrNull(Option.fromNullishOr(discordChannel.parent_id)),
  name: Option.getOrElse(Option.fromNullishOr(discordChannel.name), () => discordChannel.id),
  type: discordChannel.type,
  position: Option.getOrElse(Option.fromUndefinedOr(discordChannel.position), () => FIRST_POSITION),
  permissionOverwrites: Option.getOrElse(
    Option.fromNullishOr(discordChannel.permission_overwrites),
    Array.empty,
  ),
  archive: Boolean.match(archived.includes(discordChannel.id), {
    onTrue: () => "archived" as const,
    onFalse: () => "open" as const,
  }),
});

const loadAccess = (guildId: string): Effect.Effect<ReadonlyMap<string, BotAccess>> =>
  Effect.promise(() =>
    db
      .select({ id: channel.id, botAccess: channel.botAccess, hiddenAt: channel.hiddenAt })
      .from(channel)
      .where(eq(channel.guildId, guildId)),
  ).pipe(Effect.map((rows) => new Map(rows.map((row) => [row.id, accessOf(row)]))));

const UPSERT_BATCH = 50;

const upsertChannels = (sync: ChannelSync): Effect.Effect<void> =>
  Effect.all({
    previous: loadAccess(sync.discordGuild.id),
    now: DateTime.now,
  }).pipe(
    Effect.map(({ previous, now }) =>
      sync.stored.map((discordChannel) => {
        const known = Option.fromUndefinedOr(previous.get(discordChannel.id));
        const access = observeAccess({
          readable: sync.readable.includes(discordChannel.id),
          previous: Option.getOrElse(known, () => READABLE),
          now,
        });
        const row = { ...toChannelRow(sync, discordChannel), ...columnsOf(access) };
        return db
          .insert(channel)
          .values(row)
          .onConflictDoUpdate({
            target: channel.id,
            set: {
              parentId: row.parentId,
              name: row.name,
              position: row.position,
              permissionOverwrites: row.permissionOverwrites,
              botAccess: row.botAccess,
              hiddenAt: row.hiddenAt,
              archive: row.archive,
            },
          });
      }),
    ),
    Effect.flatMap((statements) =>
      Effect.forEach(
        Array.chunksOf(statements, UPSERT_BATCH),
        (batch) => Effect.promise(() => db.batch(batch)),
        { discard: true },
      ),
    ),
  );

const syncChannels = (sync: ChannelSync): Effect.Effect<void> =>
  settleStoredChannels(sync).pipe(
    Effect.andThen(upsertChannels(sync)),
    Effect.andThen(refreshIngest(sync.discordGuild.id)),
  );

export { syncChannels };
