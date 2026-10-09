import { env } from "cloudflare:workers";
import { OAuth2Routes, OAuth2Scopes, PermissionFlagsBits } from "discord-api-types/v10";
import { count } from "drizzle-orm";
import { Array, Effect, Option } from "effect";

import { guildLimit } from "#/features/ingest/index.server";
import { db, guild } from "#/shared/db/index.server";

const BOT_PERMISSIONS = PermissionFlagsBits.ViewChannel + PermissionFlagsBits.ReadMessageHistory;
const NO_GUILDS = 0;

type Invite =
  | Readonly<{ status: "open"; url: string; remaining: number }>
  | Readonly<{ status: "full"; limit: number }>;

const inviteUrl = (): string => {
  const url = new URL(OAuth2Routes.authorizationURL);
  url.searchParams.set("client_id", env.DISCORD_CLIENT_ID);
  url.searchParams.set("scope", OAuth2Scopes.Bot);
  url.searchParams.set("permissions", BOT_PERMISSIONS.toString());
  return url.href;
};

const registeredGuilds: Effect.Effect<number> = Effect.promise(() =>
  db.select({ total: count() }).from(guild),
).pipe(
  Effect.map((rows) =>
    Option.getOrElse(
      Option.map(Array.head(rows), ({ total }) => total),
      () => NO_GUILDS,
    ),
  ),
);

const invite: Effect.Effect<Invite> = Effect.all({
  limit: guildLimit,
  registered: registeredGuilds,
}).pipe(
  Effect.map(({ limit, registered }): Invite => {
    const remaining = limit - registered;
    return Option.match(
      Option.liftPredicate(remaining, (left) => left > NO_GUILDS),
      {
        onNone: () => ({ status: "full", limit }),
        onSome: (left) => ({ status: "open", url: inviteUrl(), remaining: left }),
      },
    );
  }),
);

export { invite };
export type { Invite };
