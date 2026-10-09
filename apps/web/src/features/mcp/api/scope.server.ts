import { and, eq } from "drizzle-orm";
import { Array, Boolean, Effect, Option, Record } from "effect";

import { canManageGuild } from "#/features/mcp/model/permissions";
import { visibleChannelIds } from "#/features/mcp/model/visibility";
import type { GuildChannel, GuildSnapshot } from "#/features/mcp/model/visibility";
import { account } from "#/shared/auth/index.server";
import { channel, db, guild, role } from "#/shared/db/index.server";
import { findMember } from "#/shared/discord/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";

import { hasActiveGrant, isOperator } from "./support.server";

const DISCORD_PROVIDER = "discord";

type StoredChannel = GuildChannel & Readonly<{ name: string }>;

type StoredGuild = Omit<GuildSnapshot, "channels"> &
  Readonly<{ name: string; wrappedKey: string; channels: readonly StoredChannel[] }>;

type GuildAccess = "manager" | "member" | "support";

type GuildScope = Readonly<{
  guild: StoredGuild;
  visible: readonly string[];
  access: GuildAccess;
}>;

const discordUserIdOf = (userId: string): Effect.Effect<Option.Option<string>> =>
  Effect.promise(() =>
    db
      .select({ accountId: account.accountId })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, DISCORD_PROVIDER))),
  ).pipe(Effect.map((rows) => Option.map(Array.head(rows), ({ accountId }) => accountId)));

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

const memberScope = (
  stored: StoredGuild,
  discordUserId: string,
  roleIds: readonly string[],
): GuildScope => ({
  guild: stored,
  visible: [...visibleChannelIds(stored, Option.some({ userId: discordUserId, roleIds }))],
  access: Boolean.match(
    canManageGuild({
      guildId: stored.guildId,
      ownerId: stored.ownerId,
      userId: discordUserId,
      memberRoleIds: roleIds,
      rolePermissions: stored.rolePermissions,
    }),
    { onTrue: () => "manager", onFalse: () => "member" },
  ),
});

const supportScope = (
  stored: StoredGuild,
  discordUserId: string,
): Effect.Effect<Option.Option<GuildScope>> =>
  Option.match(Option.liftPredicate(discordUserId, isOperator), {
    onNone: () => Effect.succeedNone,
    onSome: () =>
      hasActiveGrant(stored.guildId).pipe(
        Effect.map((granted) =>
          Option.liftPredicate(
            {
              guild: stored,
              visible: stored.channels.map(({ id }) => id),
              access: "support" as const,
            },
            () => granted,
          ),
        ),
      ),
  });

const scopeOf = (
  stored: StoredGuild,
  discordUserId: string,
): Effect.Effect<Option.Option<GuildScope>, DiscordRequestError> =>
  findMember(stored.guildId, discordUserId).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => supportScope(stored, discordUserId),
        onSome: ({ roles }) => Effect.succeedSome(memberScope(stored, discordUserId, roles)),
      }),
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

export { discordUserIdOf, listGuildIds, resolveScope };
export type { GuildAccess, GuildScope, StoredChannel, StoredGuild };
