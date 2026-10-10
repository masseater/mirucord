import { OpenFeature, TypedInMemoryProvider } from "@openfeature/server-sdk";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { Array, Boolean, Config, ConfigProvider, DateTime, Effect, Option, pipe } from "effect";

import { createGuildKey, isRotating, rewrapGuildKey } from "#/shared/crypto/index.server";
import { db, guild, listGuildIds, role } from "#/shared/db/index.server";
import { getBotUserId, getGuild, leaveGuild, listBotGuilds } from "#/shared/discord/index.server";
import type { DiscordGuild, DiscordRequestError } from "#/shared/discord/index.server";

import { listChannelsOf } from "./channel-listing.server";
import { forgetGuildMessages } from "./message-rows.server";
import { syncChannels } from "./sync-channels.server";

const INGEST_FLAG = "ingest-enabled";

const flagConfiguration = {
  [INGEST_FLAG]: {
    variants: { on: true, off: false },
    defaultVariant: "on",
    disabled: false,
  },
} as const;

const ingestEnabled: Effect.Effect<boolean> = Effect.promise(() =>
  OpenFeature.setProviderAndWait(new TypedInMemoryProvider(flagConfiguration)),
).pipe(
  Effect.andThen(Effect.promise(() => OpenFeature.getClient().getBooleanValue(INGEST_FLAG, false))),
);
const DEFAULT_GUILD_LIMIT = 80;

const logDiscordFailure = (status: Option.Option<number>): Effect.Effect<void> =>
  Effect.logWarning("Discord request failed").pipe(
    Effect.annotateLogs({ status: Option.getOrElse(status, () => "network") }),
  );

const guildLimit: Effect.Effect<number> = Config.Int("MAX_GUILDS")
  .pipe(Config.withDefault(DEFAULT_GUILD_LIMIT))
  .parse(ConfigProvider.fromUnknown(env))
  .pipe(Effect.orDie);

const admitGuilds = (
  current: readonly string[],
  stored: readonly string[],
): Effect.Effect<readonly string[]> =>
  guildLimit.pipe(
    Effect.map((limit) => {
      const kept = current.filter((id) => stored.includes(id));
      const fresh = current.filter((id) => !stored.includes(id));
      return [...kept, ...Array.take(fresh, limit - kept.length)];
    }),
  );

const leaveOverLimit = (rejected: readonly string[]): Effect.Effect<void> =>
  Effect.forEach(
    rejected,
    (guildId) =>
      leaveGuild(guildId).pipe(
        Effect.andThen(Effect.logWarning("Left a server over the guild limit")),
        Effect.catchTag("DiscordRequestError", ({ status }) => logDiscordFailure(status)),
        Effect.annotateLogs({ guildId }),
      ),
    { discard: true },
  );

const removeDepartedGuilds = (
  stored: readonly string[],
  admitted: readonly string[],
): Effect.Effect<void> =>
  Effect.forEach(
    stored.filter((id) => !admitted.includes(id)),
    (id) =>
      forgetGuildMessages(id).pipe(
        Effect.andThen(Effect.promise(() => db.delete(guild).where(eq(guild.id, id)))),
      ),
    { discard: true },
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

const insertGuild = (discordGuild: DiscordGuild): Effect.Effect<void> =>
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

const upsertGuild = (discordGuild: DiscordGuild, stored: readonly string[]): Effect.Effect<void> =>
  Boolean.match(stored.includes(discordGuild.id), {
    onTrue: () => updateGuild(discordGuild),
    onFalse: () => insertGuild(discordGuild),
  });

const syncGuild = (
  botUserId: string,
  stored: readonly string[],
  guildId: string,
): Effect.Effect<void, DiscordRequestError> =>
  Effect.gen(function* sync() {
    const discordGuild = yield* getGuild(guildId);
    const listing = yield* listChannelsOf({ botUserId, discordGuild });
    yield* upsertGuild(discordGuild, stored);
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

const syncAll: Effect.Effect<void, DiscordRequestError> = Effect.gen(function* syncAll() {
  const rotating = yield* isRotating;
  if (rotating) {
    yield* rewrapGuildKeys;
  }
  const current = (yield* listBotGuilds).map(({ id }) => id);
  const botUserId = yield* getBotUserId;
  const stored = yield* listGuildIds;
  const admitted = yield* admitGuilds(current, stored);
  yield* leaveOverLimit(current.filter((id) => !admitted.includes(id)));
  yield* removeDepartedGuilds(stored, admitted);
  yield* Effect.forEach(
    admitted,
    (id) =>
      syncGuild(botUserId, stored, id).pipe(
        Effect.catchTag("DiscordRequestError", ({ status }) => logDiscordFailure(status)),
      ),
    { discard: true },
  );
});

const syncGuilds: Effect.Effect<void, DiscordRequestError> = Effect.gen(function* syncGuilds() {
  const enabled = yield* ingestEnabled;
  if (enabled) {
    yield* syncAll;
  }
});

export { guildLimit, syncGuilds };
