import { and, eq } from "drizzle-orm";
import { Array, Effect, Option } from "effect";

import { db } from "#/shared/db/client.server";

import { getAuth } from "./auth.server";
import { account } from "./generated/auth.table";

const DISCORD_PROVIDER = "discord";

type SignedInUser = Readonly<{ userId: string; name: string; discordUserId: string }>;

const discordUserIdOf = (userId: string): Effect.Effect<Option.Option<string>> =>
  Effect.promise(() =>
    db
      .select({ accountId: account.accountId })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, DISCORD_PROVIDER))),
  ).pipe(Effect.map((rows) => Option.map(Array.head(rows), ({ accountId }) => accountId)));

const signedInUser = (request: Request): Effect.Effect<Option.Option<SignedInUser>> =>
  Effect.promise(() => getAuth().api.getSession({ headers: request.headers })).pipe(
    Effect.flatMap((session) =>
      Option.match(Option.fromNullOr(session), {
        onNone: () => Effect.succeedNone,
        onSome: ({ user }) =>
          discordUserIdOf(user.id).pipe(
            Effect.map(
              Option.map((discordUserId) => ({ userId: user.id, name: user.name, discordUserId })),
            ),
          ),
      }),
    ),
  );

export { discordUserIdOf, signedInUser };
export type { SignedInUser };
