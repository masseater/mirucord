import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { Array, Config, ConfigProvider, Effect, Option } from "effect";

import { db, guild } from "#/shared/db/index.server";
import { getBotUserId, leaveGuild, listBotGuilds } from "#/shared/discord/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";

import { forgetGuildMessages } from "./message-rows.server";

const DEFAULT_GUILD_LIMIT = 80;

const selectIds = <Row extends Readonly<{ id: string }>>(
  load: () => Promise<readonly Row[]>,
): Effect.Effect<readonly string[]> =>
  Effect.promise(load).pipe(Effect.map((rows) => rows.map(({ id }) => id)));

const logDiscordFailure = (status: Option.Option<number>): Effect.Effect<void> =>
  Effect.logWarning("Discord request failed").pipe(
    Effect.annotateLogs({ status: Option.getOrElse(status, () => "network") }),
  );

const guildLimit: Effect.Effect<number> = Config.Int("MAX_GUILDS")
  .pipe(Config.withDefault(DEFAULT_GUILD_LIMIT))
  .parse(ConfigProvider.fromUnknown(env))
  .pipe(Effect.orDie);

const admitGuilds = (current: readonly string[]): Effect.Effect<readonly string[]> =>
  Effect.all({
    limit: guildLimit,
    stored: selectIds(() => db.select({ id: guild.id }).from(guild)),
  }).pipe(
    Effect.map(({ limit, stored }) => {
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

const removeDepartedGuilds = (current: readonly string[]): Effect.Effect<void> =>
  selectIds(() => db.select({ id: guild.id }).from(guild)).pipe(
    Effect.map((stored) => stored.filter((id) => !current.includes(id))),
    Effect.flatMap((departed) =>
      Effect.forEach(
        departed,
        (id) =>
          forgetGuildMessages(id).pipe(
            Effect.andThen(Effect.promise(() => db.delete(guild).where(eq(guild.id, id)))),
          ),
        { discard: true },
      ),
    ),
  );

type Membership = Readonly<{
  botUserId: string;
  admitted: readonly string[];
  fresh: readonly string[];
}>;

const reconcileMembership: Effect.Effect<Membership, DiscordRequestError> = Effect.gen(
  function* reconcileMembership() {
    const current = (yield* listBotGuilds).map(({ id }) => id);
    const stored = yield* selectIds(() => db.select({ id: guild.id }).from(guild));
    const botUserId = yield* getBotUserId;
    const admitted = yield* admitGuilds(current);
    yield* leaveOverLimit(current.filter((id) => !admitted.includes(id)));
    yield* removeDepartedGuilds(admitted);
    return { botUserId, admitted, fresh: admitted.filter((id) => !stored.includes(id)) };
  },
);

export { guildLimit, logDiscordFailure, reconcileMembership };
export type { Membership };
