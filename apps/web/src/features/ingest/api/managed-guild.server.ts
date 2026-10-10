import { eq } from "drizzle-orm";
import { Array, Effect, Option } from "effect";

import type { ConsentScope } from "#/features/ingest/model/consent-scope";
import { db, guild, ingestConsent, loadRolePermissions } from "#/shared/db/index.server";
import { findMember } from "#/shared/discord/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";
import { isGuildManager } from "#/shared/permissions";

const MEMBER_CONCURRENCY = 4;

type ManagedGuild = Readonly<{ id: string; name: string; consent: ConsentScope["status"] }>;

type GuildMembership = Readonly<{ guildId: string; userId: string }>;

const managedGuild = ({
  guildId,
  userId,
}: GuildMembership): Effect.Effect<
  Option.Option<Readonly<{ name: string }>>,
  DiscordRequestError
> =>
  Effect.all({
    stored: Effect.promise(() =>
      db
        .select({ name: guild.name, ownerId: guild.ownerId })
        .from(guild)
        .where(eq(guild.id, guildId)),
    ).pipe(Effect.map(Array.head)),
    rolePermissions: loadRolePermissions(guildId),
    member: findMember(guildId, userId),
  }).pipe(
    Effect.map(({ stored, rolePermissions, member }) =>
      stored.pipe(
        Option.flatMap(({ name, ownerId }) =>
          member.pipe(
            Option.filter(({ roles }) =>
              isGuildManager({ guildId, ownerId, userId, memberRoleIds: roles, rolePermissions }),
            ),
            Option.as({ name }),
          ),
        ),
      ),
    ),
  );

const listManagedGuilds = (userId: string): Effect.Effect<readonly ManagedGuild[]> =>
  Effect.promise(() =>
    db
      .select({ id: guild.id, consentedAt: ingestConsent.grantedAt })
      .from(guild)
      .leftJoin(ingestConsent, eq(ingestConsent.guildId, guild.id)),
  ).pipe(
    Effect.flatMap((rows) =>
      Effect.forEach(
        rows,
        ({ id, consentedAt }) =>
          managedGuild({ guildId: id, userId }).pipe(
            Effect.map(
              Option.map(({ name }): ManagedGuild => ({
                id,
                name,
                consent: Option.match(Option.fromNullOr(consentedAt), {
                  onNone: () => "awaiting",
                  onSome: () => "granted",
                }),
              })),
            ),
            Effect.catchTag("DiscordRequestError", () =>
              Effect.logWarning("Could not check server management").pipe(
                Effect.annotateLogs({ guildId: id }),
                Effect.as(Option.none<ManagedGuild>()),
              ),
            ),
          ),
        { concurrency: MEMBER_CONCURRENCY },
      ),
    ),
    Effect.map(Array.getSomes),
  );

export { listManagedGuilds, managedGuild };
export type { GuildMembership, ManagedGuild };
