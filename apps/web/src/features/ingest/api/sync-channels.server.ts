import { eq } from "drizzle-orm";
import { Array, DateTime, Effect, Option } from "effect";

import { observeAccess } from "#/features/ingest/model/bot-access";
import type { BotAccess } from "#/features/ingest/model/bot-access";
import { channel, db } from "#/shared/db/index.server";
import type {
  DiscordChannel,
  DiscordGuild,
  DiscordRequestError,
} from "#/shared/discord/index.server";

import { accessOf, columnsOf } from "./bot-access.server";
import { botReadableChannels } from "./bot-readable.server";
import { refreshIngest } from "./consent-scope.server";

type ChannelRow = typeof channel.$inferInsert;

type ChannelSync = Readonly<{
  botUserId: string;
  discordGuild: DiscordGuild;
  channels: readonly DiscordChannel[];
  ingested: readonly DiscordChannel[];
}>;

const READABLE: BotAccess = { status: "readable" };

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

const loadAccess = (guildId: string): Effect.Effect<ReadonlyMap<string, BotAccess>> =>
  Effect.promise(() =>
    db
      .select({ id: channel.id, botAccess: channel.botAccess, hiddenAt: channel.hiddenAt })
      .from(channel)
      .where(eq(channel.guildId, guildId)),
  ).pipe(Effect.map((rows) => new Map(rows.map((row) => [row.id, accessOf(row)]))));

const upsertChannel = (row: ChannelRow): Effect.Effect<void> =>
  Effect.asVoid(
    Effect.promise(() =>
      db
        .insert(channel)
        .values(row)
        .onConflictDoUpdate({
          target: channel.id,
          set: {
            parentId: row.parentId,
            name: row.name,
            permissionOverwrites: row.permissionOverwrites,
            botAccess: row.botAccess,
            hiddenAt: row.hiddenAt,
          },
        }),
    ),
  );

const upsertChannels = (sync: ChannelSync): Effect.Effect<void, DiscordRequestError> =>
  Effect.all({
    readable: botReadableChannels(sync),
    previous: loadAccess(sync.discordGuild.id),
    now: DateTime.now,
  }).pipe(
    Effect.flatMap(({ readable, previous, now }) =>
      Effect.forEach(
        sync.ingested,
        (discordChannel) => {
          const known = Option.fromUndefinedOr(previous.get(discordChannel.id));
          const access = observeAccess({
            readable: readable.has(discordChannel.id),
            previous: Option.getOrElse(known, () => READABLE),
            now,
          });
          return upsertChannel({
            ...toChannelRow(sync.discordGuild.id, discordChannel),
            ...columnsOf(access),
          });
        },
        { discard: true },
      ),
    ),
  );

const syncChannels = (sync: ChannelSync): Effect.Effect<void, DiscordRequestError> =>
  upsertChannels(sync).pipe(Effect.andThen(refreshIngest(sync.discordGuild.id)));

export { syncChannels };
export type { ChannelSync };
