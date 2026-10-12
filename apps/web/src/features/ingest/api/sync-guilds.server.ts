import { eq } from "drizzle-orm";
import { Array, DateTime, Effect, Option } from "effect";

import { createGuildKey } from "#/shared/crypto/index.server";
import { db, guild, listGuildIds, role } from "#/shared/db/index.server";
import { getBotUserId, getGuild } from "#/shared/discord/index.server";
import type { DiscordGuild, DiscordRequestError } from "#/shared/discord/index.server";

import { listChannelsOf } from "./channel-listing.server";
import { logDiscordFailure, reconcileMembership } from "./guild-membership.server";
import { welcomeGuild } from "./guild-welcome.server";
import { whenIngestEnabled } from "./ingest-flag.server";
import { syncChannels } from "./sync-channels.server";

const syncedFields = ({
  name,
  icon,
  owner_id,
}: DiscordGuild): Pick<typeof guild.$inferInsert, "name" | "icon" | "ownerId"> => ({
  name,
  icon: Option.getOrNull(Option.fromNullishOr(icon)),
  ownerId: owner_id,
});

const updateGuild = (discordGuild: DiscordGuild): Effect.Effect<void> =>
  Effect.asVoid(
    Effect.promise(() =>
      db.update(guild).set(syncedFields(discordGuild)).where(eq(guild.id, discordGuild.id)),
    ),
  );

type GuildArrival = "joined" | "known";

const insertGuild = (discordGuild: DiscordGuild): Effect.Effect<GuildArrival> =>
  Effect.all({ wrappedKey: createGuildKey, now: DateTime.now }).pipe(
    Effect.flatMap(({ wrappedKey, now }) =>
      Effect.promise(() =>
        db
          .insert(guild)
          .values({
            id: discordGuild.id,
            ...syncedFields(discordGuild),
            wrappedKey,
            joinedAt: DateTime.toDate(now),
          })
          .onConflictDoNothing({ target: guild.id })
          .returning({ id: guild.id }),
      ),
    ),
    Effect.map((inserted): GuildArrival => {
      if (Array.isReadonlyArrayEmpty(inserted)) {
        return "known";
      }
      return "joined";
    }),
  );

const upsertGuild = (discordGuild: DiscordGuild): Effect.Effect<GuildArrival> =>
  insertGuild(discordGuild).pipe(
    Effect.tap((arrival) => {
      if (arrival === "joined") {
        return Effect.void;
      }
      return updateGuild(discordGuild);
    }),
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

const syncGuild = (botUserId: string, guildId: string): Effect.Effect<void, DiscordRequestError> =>
  Effect.gen(function* sync() {
    const discordGuild = yield* getGuild(guildId);
    const listing = yield* listChannelsOf({ botUserId, discordGuild });
    const arrival = yield* upsertGuild(discordGuild);
    yield* replaceRoles(discordGuild);
    yield* syncChannels({ discordGuild, ...listing });
    if (arrival === "joined") {
      yield* welcomeGuild({ botUserId, discordGuild, listing });
    }
  });

const eachGuild = (
  guildIds: readonly string[],
  sync: (guildId: string) => Effect.Effect<void, DiscordRequestError>,
): Effect.Effect<void> =>
  Effect.forEach(
    guildIds,
    (guildId) =>
      sync(guildId).pipe(
        Effect.catchTag("DiscordRequestError", ({ status }) => logDiscordFailure(status)),
        Effect.annotateLogs({ guildId }),
      ),
    { discard: true },
  );

const syncOneGuild = (guildId: string): Effect.Effect<void, DiscordRequestError> =>
  whenIngestEnabled(
    Effect.gen(function* syncNamedGuild() {
      const botUserId = yield* getBotUserId;
      yield* syncGuild(botUserId, guildId).pipe(Effect.annotateLogs({ guildId }));
    }),
  );

const admitJoinedGuild = (guildId: string): Effect.Effect<void, DiscordRequestError> =>
  reconcileMembership.pipe(
    Effect.flatMap(({ botUserId, fresh }) =>
      eachGuild(
        fresh.filter((id) => id === guildId),
        (id) => syncGuild(botUserId, id),
      ),
    ),
  );

const syncJoinedGuild = (guildId: string): Effect.Effect<void, DiscordRequestError> =>
  whenIngestEnabled(
    listGuildIds.pipe(
      Effect.flatMap((stored) => {
        if (stored.includes(guildId)) {
          return Effect.void;
        }
        return admitJoinedGuild(guildId);
      }),
    ),
  );

const syncKnownGuild = (guildId: string): Effect.Effect<void, DiscordRequestError> =>
  listGuildIds.pipe(
    Effect.flatMap((stored) => {
      if (stored.includes(guildId)) {
        return syncOneGuild(guildId);
      }
      return Effect.void;
    }),
  );

export { syncJoinedGuild, syncKnownGuild, syncOneGuild };
