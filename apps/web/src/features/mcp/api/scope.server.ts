import { and, eq } from "drizzle-orm";
import { Array, Effect, Option } from "effect";

import type { ChannelProgress, Consent } from "#/features/mcp/model/ingest-status";
import { channel, db, guild, ingestConsent, loadRolePermissions } from "#/shared/db/index.server";
import { findMember } from "#/shared/discord/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";
import { visibleChannelIds } from "#/shared/permissions";
import type { GuildChannel, GuildSnapshot } from "#/shared/permissions";

const MEMBER_CONCURRENCY = 4;

type StoredChannel = GuildChannel & ChannelProgress & Readonly<{ name: string }>;

type StoredGuild = Omit<GuildSnapshot, "channels"> &
  Readonly<{
    name: string;
    icon: string | null;
    wrappedKey: string;
    consent: Consent;
    channels: readonly StoredChannel[];
  }>;

type ReadableGuild = Readonly<{
  guildId: string;
  name: string;
  icon: string | null;
  consent: Consent;
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
      .where(and(eq(ingestConsent.guildId, guildId), eq(ingestConsent.state, "granted"))),
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
          Effect.all(
            {
              channels: loadChannels(guildId),
              rolePermissions: loadRolePermissions(guildId),
              consent: loadConsent(guildId),
            },
            { concurrency: "unbounded" },
          ).pipe(Effect.map((parts) => Option.some({ ...row, ...parts, guildId }))),
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

const consentOf = (granted: string | null): Consent =>
  Option.match(Option.fromNullOr(granted), {
    onNone: () => "notConsented",
    onSome: () => "consented",
  });

const readableGuilds = (
  discordUserId: string,
): Effect.Effect<readonly ReadableGuild[], DiscordRequestError> =>
  Effect.promise(() =>
    db
      .select({
        guildId: guild.id,
        name: guild.name,
        icon: guild.icon,
        granted: ingestConsent.guildId,
      })
      .from(guild)
      .leftJoin(
        ingestConsent,
        and(eq(ingestConsent.guildId, guild.id), eq(ingestConsent.state, "granted")),
      ),
  ).pipe(
    Effect.flatMap((rows) =>
      Effect.forEach(
        rows,
        ({ granted, ...stored }) => {
          const readable: ReadableGuild = { ...stored, consent: consentOf(granted) };
          return findMember(stored.guildId, discordUserId).pipe(Effect.map(Option.as(readable)));
        },
        { concurrency: MEMBER_CONCURRENCY },
      ),
    ),
    Effect.map(Array.getSomes),
  );

export { readableGuilds, resolveScope };
export type { GuildScope, ReadableGuild, StoredChannel, StoredGuild };
