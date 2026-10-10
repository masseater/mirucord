import { eq } from "drizzle-orm";
import { Array, Effect, Option, Record } from "effect";

import { visibleChannelIds } from "#/features/mcp/model/visibility";
import type { GuildChannel, GuildSnapshot } from "#/features/mcp/model/visibility";
import { channel, db, guild, role } from "#/shared/db/index.server";
import { findMember } from "#/shared/discord/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";

type StoredChannel = GuildChannel & Readonly<{ name: string }>;

type StoredGuild = Omit<GuildSnapshot, "channels"> &
  Readonly<{ name: string; wrappedKey: string; channels: readonly StoredChannel[] }>;

type GuildScope = Readonly<{
  guild: StoredGuild;
  visible: readonly string[];
}>;

const listGuildIds: Effect.Effect<readonly string[]> = Effect.promise(() =>
  db.select({ id: guild.id }).from(guild),
).pipe(Effect.map((rows) => rows.map(({ id }) => id)));

const loadChannels = (guildId: string): Effect.Effect<readonly StoredChannel[]> =>
  Effect.promise(() =>
    db
      .select({
        id: channel.id,
        name: channel.name,
        parentId: channel.parentId,
        type: channel.type,
        permissionOverwrites: channel.permissionOverwrites,
      })
      .from(channel)
      .where(eq(channel.guildId, guildId)),
  ).pipe(
    Effect.map((rows) =>
      rows.map((row) => ({ ...row, parentId: Option.fromNullOr(row.parentId) })),
    ),
  );

const loadRolePermissions = (guildId: string): Effect.Effect<Readonly<Record<string, string>>> =>
  Effect.promise(() =>
    db
      .select({ id: role.id, permissions: role.permissions })
      .from(role)
      .where(eq(role.guildId, guildId)),
  ).pipe(
    Effect.map((rows) => Record.fromEntries(rows.map(({ id, permissions }) => [id, permissions]))),
  );

const loadGuild = (guildId: string): Effect.Effect<Option.Option<StoredGuild>> =>
  Effect.promise(() =>
    db
      .select({ name: guild.name, ownerId: guild.ownerId, wrappedKey: guild.wrappedKey })
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

export { listGuildIds, resolveScope };
export type { GuildScope, StoredChannel, StoredGuild };
