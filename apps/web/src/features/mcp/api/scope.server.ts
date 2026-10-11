import { and, eq } from "drizzle-orm";
import { Array, Effect, Option, pipe } from "effect";

import type { ChannelProgress, Consent } from "#/features/mcp/model/ingest-status";
import {
  channel,
  db,
  guild,
  ingestConsent,
  listGuildIds,
  loadRolePermissions,
} from "#/shared/db/index.server";
import { findMember } from "#/shared/discord/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";
import { visibleChannelIds } from "#/shared/permissions";
import type { GuildChannel, GuildSnapshot } from "#/shared/permissions";

type StoredChannel = GuildChannel & ChannelProgress & Readonly<{ name: string }>;

type StoredGuild = Omit<GuildSnapshot, "channels"> &
  Readonly<{
    name: string;
    icon: string | null;
    wrappedKey: string;
    consent: Consent;
    channels: readonly StoredChannel[];
  }>;

type GuildScope = Readonly<{
  guild: StoredGuild;
  visible: readonly string[];
}>;

const loadChannels = (guildId: string): Effect.Effect<readonly StoredChannel[]> =>
  Effect.promise(() =>
    db
      .select({
        id: channel.id,
        name: channel.name,
        parentId: channel.parentId,
        type: channel.type,
        permissionOverwrites: channel.permissionOverwrites,
        newest: channel.newestMessageId,
        backfill: channel.backfill,
      })
      .from(channel)
      .where(and(eq(channel.guildId, guildId), eq(channel.botAccess, "readable"))),
  ).pipe(
    Effect.map((rows) =>
      rows.map((row) => ({
        ...row,
        parentId: Option.fromNullOr(row.parentId),
        newest: Option.fromNullOr(row.newest),
      })),
    ),
  );

const loadConsent = (guildId: string): Effect.Effect<Consent> =>
  Effect.promise(() =>
    db
      .select({ guildId: ingestConsent.guildId })
      .from(ingestConsent)
      .where(eq(ingestConsent.guildId, guildId)),
  ).pipe(
    Effect.map((rows): Consent =>
      Array.match(rows, { onEmpty: () => "notConsented", onNonEmpty: () => "consented" }),
    ),
  );

const loadGuild = (guildId: string): Effect.Effect<Option.Option<StoredGuild>> =>
  Effect.promise(() =>
    db
      .select({
        name: guild.name,
        icon: guild.icon,
        ownerId: guild.ownerId,
        wrappedKey: guild.wrappedKey,
      })
      .from(guild)
      .where(eq(guild.id, guildId)),
  ).pipe(
    Effect.map(Array.head),
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: (row) =>
          Effect.all({
            channels: loadChannels(guildId),
            rolePermissions: loadRolePermissions(guildId),
            consent: loadConsent(guildId),
          }).pipe(Effect.map((parts) => Option.some({ ...row, ...parts, guildId }))),
      }),
    ),
  );

const scopeOf = (
  stored: StoredGuild,
  discordUserId: string,
): Effect.Effect<Option.Option<GuildScope>, DiscordRequestError> =>
  findMember(stored.guildId, discordUserId).pipe(
    Effect.map(
      Option.map(({ roles }) => ({
        guild: stored,
        visible: [
          ...visibleChannelIds(stored, Option.some({ userId: discordUserId, roleIds: roles })),
        ],
      })),
    ),
  );

const resolveScope = ({
  guildId,
  discordUserId,
}: Readonly<{ guildId: string; discordUserId: string }>): Effect.Effect<
  Option.Option<GuildScope>,
  DiscordRequestError
> =>
  loadGuild(guildId).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: (stored) => scopeOf(stored, discordUserId),
      }),
    ),
  );

const readableGuilds = (
  discordUserId: string,
): Effect.Effect<readonly StoredGuild[], DiscordRequestError> =>
  listGuildIds.pipe(
    Effect.flatMap((guildIds) =>
      pipe(
        guildIds,
        Effect.forEach((guildId) => resolveScope({ guildId, discordUserId })),
      ),
    ),
    Effect.map((scopes) => Array.getSomes(scopes).map(({ guild: stored }) => stored)),
  );

export { readableGuilds, resolveScope };
export type { GuildScope, StoredChannel, StoredGuild };
