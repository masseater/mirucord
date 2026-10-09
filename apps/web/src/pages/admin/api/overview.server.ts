import { getRequestHeaders } from "@tanstack/react-start/server";
import { count, eq } from "drizzle-orm";
import { DateTime, Effect, Option, Record } from "effect";

import { guildLimit } from "#/features/ingest/index.server";
import { discordUserIdOf, isOperator } from "#/features/mcp/index.server";
import { auth } from "#/shared/auth/index.server";
import { channel, db, guild, message } from "#/shared/db/index.server";

type AdminGuild = Readonly<{
  id: string;
  name: string;
  joinedAt: string;
  channels: number;
  backfilled: number;
  messages: number;
}>;

type AdminOverview =
  | Readonly<{ status: "signed-out" }>
  | Readonly<{ status: "forbidden" }>
  | Readonly<{ status: "ok"; limit: number; guilds: readonly AdminGuild[] }>;

const NO_ROWS = 0;

type GuildCount = Readonly<{ guildId: string; total: number }>;

const countsByGuild = (
  load: () => Promise<readonly GuildCount[]>,
): Effect.Effect<Readonly<Record<string, number>>> =>
  Effect.promise(load).pipe(
    Effect.map((rows) => Record.fromEntries(rows.map(({ guildId, total }) => [guildId, total]))),
  );

const countOf = (counts: Readonly<Record<string, number>>, guildId: string): number =>
  Option.getOrElse(Record.get(counts, guildId), () => NO_ROWS);

const listGuilds: Effect.Effect<readonly AdminGuild[]> = Effect.all({
  guilds: Effect.promise(() =>
    db.select({ id: guild.id, name: guild.name, joinedAt: guild.joinedAt }).from(guild),
  ),
  channels: countsByGuild(() =>
    db.select({ guildId: channel.guildId, total: count() }).from(channel).groupBy(channel.guildId),
  ),
  backfilled: countsByGuild(() =>
    db
      .select({ guildId: channel.guildId, total: count() })
      .from(channel)
      .where(eq(channel.backfill, "done"))
      .groupBy(channel.guildId),
  ),
  messages: countsByGuild(() =>
    db.select({ guildId: message.guildId, total: count() }).from(message).groupBy(message.guildId),
  ),
}).pipe(
  Effect.map(({ guilds, channels, backfilled, messages }) =>
    guilds.map(({ id, name, joinedAt }) => ({
      id,
      name,
      joinedAt: DateTime.formatIso(DateTime.fromDateUnsafe(joinedAt)),
      channels: countOf(channels, id),
      backfilled: countOf(backfilled, id),
      messages: countOf(messages, id),
    })),
  ),
);

const signedInDiscordUser: Effect.Effect<Option.Option<string>> = Effect.promise(() =>
  auth.api.getSession({ headers: getRequestHeaders() }),
).pipe(
  Effect.map(Option.fromNullishOr),
  Effect.flatMap(
    Option.match({
      onNone: () => Effect.succeedNone,
      onSome: ({ user }) => discordUserIdOf(user.id),
    }),
  ),
);

const overviewFor = (discordUserId: string): Effect.Effect<AdminOverview> =>
  Option.match(Option.liftPredicate(discordUserId, isOperator), {
    onNone: () => Effect.succeed({ status: "forbidden" } as const),
    onSome: () =>
      Effect.all({ limit: guildLimit, guilds: listGuilds }).pipe(
        Effect.map(({ limit, guilds }) => ({ status: "ok", limit, guilds }) as const),
      ),
  });

const adminOverview: Effect.Effect<AdminOverview> = signedInDiscordUser.pipe(
  Effect.flatMap(
    Option.match({
      onNone: () => Effect.succeed({ status: "signed-out" } as const),
      onSome: overviewFor,
    }),
  ),
);

export { adminOverview };
export type { AdminGuild, AdminOverview };
