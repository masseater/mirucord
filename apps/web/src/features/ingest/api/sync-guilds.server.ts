import { eq } from "drizzle-orm";
import { Array, DateTime, Effect, Option, pipe } from "effect";

import { createGuildKey, isRotating, rewrapGuildKey } from "#/shared/crypto/index.server";
import { db, guild, role } from "#/shared/db/index.server";
import { getBotUserId, getGuild } from "#/shared/discord/index.server";
import type { DiscordGuild, DiscordRequestError } from "#/shared/discord/index.server";

import { listChannelsOf } from "./channel-listing.server";
import { refreshIngest } from "./consent-scope.server";
import { logDiscordFailure, reconcileMembership } from "./guild-membership.server";
import { whenIngestEnabled } from "./ingest-flag.server";
import { syncChannels } from "./sync-channels.server";

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

const updateGuild = (discordGuild: DiscordGuild): Effect.Effect<void> =>
  Effect.asVoid(
    Effect.promise(() =>
      db
        .update(guild)
        .set({ name: discordGuild.name, ownerId: discordGuild.owner_id })
        .where(eq(guild.id, discordGuild.id)),
    ),
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
    yield* upsertGuild(discordGuild);
    yield* replaceRoles(discordGuild);
    yield* syncChannels({ discordGuild, ...listing });
  });

const rewrapGuildKeys: Effect.Effect<void> = Effect.promise(() =>
  db.select({ id: guild.id, wrappedKey: guild.wrappedKey }).from(guild),
).pipe(
  Effect.flatMap((rows) =>
    pipe(
      rows,
      Effect.forEach(({ id, wrappedKey }) =>
        rewrapGuildKey(wrappedKey).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.succeedNone,
              onSome: (rewrapped) =>
                Effect.promise(() =>
                  db.update(guild).set({ wrappedKey: rewrapped }).where(eq(guild.id, id)),
                ).pipe(Effect.as(Option.some(id))),
            }),
          ),
        ),
      ),
    ),
  ),
  Effect.flatMap((results) =>
    Effect.logInfo("Rewrapped guild keys").pipe(
      Effect.annotateLogs({ rewrapped: Array.getSomes(results).length }),
    ),
  ),
);

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

const refreshGuild = (guildId: string): Effect.Effect<void, DiscordRequestError> =>
  getGuild(guildId).pipe(Effect.tap(updateGuild), Effect.flatMap(replaceRoles));

const syncMembership = (
  refreshKnown: (guildId: string) => Effect.Effect<void, DiscordRequestError>,
): Effect.Effect<void, DiscordRequestError> =>
  Effect.gen(function* syncAdmitted() {
    const { botUserId, fresh, known } = yield* reconcileMembership;
    yield* eachGuild(fresh, (id) => syncGuild(botUserId, id));
    yield* eachGuild(known, refreshKnown);
  });

const pollGuilds: Effect.Effect<void, DiscordRequestError> = whenIngestEnabled(
  Effect.gen(function* pollGuilds() {
    const rotating = yield* isRotating;
    if (rotating) {
      yield* rewrapGuildKeys;
    }
    yield* syncMembership(refreshIngest);
  }),
);

const syncGuilds: Effect.Effect<void, DiscordRequestError> = whenIngestEnabled(
  reconcileMembership.pipe(
    Effect.flatMap(({ botUserId, admitted }) =>
      eachGuild(admitted, (id) => syncGuild(botUserId, id)),
    ),
  ),
);

const syncGuildList: Effect.Effect<void, DiscordRequestError> = whenIngestEnabled(
  syncMembership(refreshGuild),
);

const syncOneGuild = (guildId: string): Effect.Effect<void, DiscordRequestError> =>
  whenIngestEnabled(
    Effect.gen(function* syncNamedGuild() {
      const botUserId = yield* getBotUserId;
      yield* syncGuild(botUserId, guildId);
    }),
  );

export { pollGuilds, syncGuildList, syncGuilds, syncOneGuild };
