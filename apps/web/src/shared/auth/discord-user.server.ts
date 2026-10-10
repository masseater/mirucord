import { and, eq } from "drizzle-orm";
import { Array, Effect, Option } from "effect";

import { db } from "#/shared/db/client.server";

import { auth } from "./auth.server";
import { account } from "./generated/auth.table";

const DISCORD_PROVIDER = "discord";

const discordUserIdOf = (userId: string): Effect.Effect<Option.Option<string>> =>
  Effect.promise(() =>
    db
      .select({ accountId: account.accountId })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, DISCORD_PROVIDER))),
  ).pipe(Effect.map((rows) => Option.map(Array.head(rows), ({ accountId }) => accountId)));

const signedInDiscordUser = (request: Request): Effect.Effect<Option.Option<string>> =>
  Effect.promise(() => auth.api.getSession({ headers: request.headers })).pipe(
    Effect.flatMap((session) =>
      Option.match(Option.fromNullOr(session), {
        onNone: () => Effect.succeedNone,
        onSome: ({ user }) => discordUserIdOf(user.id),
      }),
    ),
  );

export { discordUserIdOf, signedInDiscordUser };
