import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { Array, Config, ConfigProvider, Effect, Option } from "effect";

import { FREE_GUILD_LIMIT } from "#/shared/config";
import { db, guild, listGuildIds } from "#/shared/db/index.server";
import { getBotUserId, leaveGuild, listBotGuilds } from "#/shared/discord/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";

import { forgetGuildMessages } from "./message-rows.server";

const logDiscordFailure = (status: Option.Option<number>): Effect.Effect<void> =>
  Effect.logWarning("Discord request failed").pipe(
    Effect.annotateLogs({ status: Option.getOrElse(status, () => "network") }),
  );

const guildLimit: Effect.Effect<number> = Config.Int("MAX_GUILDS")
  .pipe(Config.withDefault(FREE_GUILD_LIMIT))
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
  current: readonly string[],
  stored: readonly string[],
): Effect.Effect<void> =>
  Effect.forEach(
    stored.filter((id) => !current.includes(id)),
    (id) =>
      forgetGuildMessages(id).pipe(
        Effect.andThen(Effect.promise(() => db.delete(guild).where(eq(guild.id, id)))),
      ),
    { discard: true },
  );

type Membership = Readonly<{
  botUserId: string;
  admitted: readonly string[];
  fresh: readonly string[];
  known: readonly string[];
}>;

const reconcileMembership: Effect.Effect<Membership, DiscordRequestError> = Effect.gen(
  function* reconcileMembership() {
    const { botGuilds, stored, botUserId } = yield* Effect.all(
      { botGuilds: listBotGuilds, stored: listGuildIds, botUserId: getBotUserId },
      { concurrency: "unbounded" },
    );
    const current = botGuilds.map(({ id }) => id);
    const admitted = yield* admitGuilds(current, stored);
    yield* leaveOverLimit(current.filter((id) => !admitted.includes(id)));
    yield* removeDepartedGuilds(admitted, stored);
    return {
      botUserId,
      admitted,
      fresh: admitted.filter((id) => !stored.includes(id)),
      known: admitted.filter((id) => stored.includes(id)),
    };
  },
);

export { guildLimit, logDiscordFailure, reconcileMembership };
export type { Membership };
