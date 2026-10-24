import { eq } from "drizzle-orm";
import { Array, Effect, Option, pipe } from "effect";

import { guildIngestOf, SCOPE_OF_CONSENT } from "#/features/ingest/model/channel-ingest";
import type { GuildConsent, GuildIngest } from "#/features/ingest/model/channel-ingest";
import { db, guild, ingestConsent, loadRolePermissions } from "#/shared/db/index.server";
import { findMember } from "#/shared/discord/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";
import { isGuildManager } from "#/shared/permissions";

import { loadChannels } from "./settings-channels.server";

const MEMBER_CONCURRENCY = 4;

type ManagedGuild = Readonly<{
  id: string;
  name: string;
  icon: string | null;
  ingest: GuildIngest;
}>;

type GuildMembership = Readonly<{ guildId: string; userId: string }>;

const managedGuild = ({
  guildId,
  userId,
}: GuildMembership): Effect.Effect<
  Option.Option<Readonly<{ name: string }>>,
  DiscordRequestError
> =>
  Effect.all(
    {
      stored: Effect.promise(() =>
        db
          .select({ name: guild.name, ownerId: guild.ownerId })
          .from(guild)
          .where(eq(guild.id, guildId)),
      ).pipe(Effect.map(Array.head)),
      rolePermissions: loadRolePermissions(guildId),
      member: findMember(guildId, userId),
    },
    { concurrency: "unbounded" },
  ).pipe(
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

const whenManaged = <Value, const Denied, Failure>({
  membership,
  denied,
  use,
}: Readonly<{
  membership: GuildMembership;
  denied: Denied;
  use: (managed: Readonly<{ name: string }>) => Effect.Effect<Value, Failure>;
}>): Effect.Effect<Value | Denied, Failure | DiscordRequestError> =>
  managedGuild(membership).pipe(
    Effect.flatMap((managed): Effect.Effect<Value | Denied, Failure> =>
      Option.match(managed, { onNone: () => Effect.succeed(denied), onSome: use }),
    ),
  );

const managedIngest = (guildId: string, consent: GuildConsent): Effect.Effect<GuildIngest> =>
  loadChannels({
    guildId,
    scope: SCOPE_OF_CONSENT[consent],
  }).pipe(
    Effect.map(({ channels }) =>
      guildIngestOf(
        consent,
        pipe(
          channels,
          Array.map(({ ingest }) => ingest),
        ),
      ),
    ),
  );

const listManagedGuilds = (userId: string): Effect.Effect<readonly ManagedGuild[]> =>
  Effect.promise(() =>
    db
      .select({ id: guild.id, icon: guild.icon, consent: ingestConsent.state })
      .from(guild)
      .leftJoin(ingestConsent, eq(ingestConsent.guildId, guild.id)),
  ).pipe(
    Effect.flatMap((rows) =>
      Effect.forEach(
        rows,
        ({ id, icon, consent }) =>
          managedGuild({ guildId: id, userId }).pipe(
            Effect.flatMap(
              Option.match({
                onNone: () => Effect.succeedNone,
                onSome: ({ name }) =>
                  managedIngest(
                    id,
                    Option.getOrElse(Option.fromNullOr(consent), (): GuildConsent => "awaiting"),
                  ).pipe(Effect.map((ingest) => Option.some({ id, name, icon, ingest }))),
              }),
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

export { listManagedGuilds, managedGuild, whenManaged };
export type { GuildMembership, ManagedGuild };
