import { and, eq, ne } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { Array, Effect, Option, pipe, String as Str } from "effect";

import { db } from "#/shared/db/client.server";

import { getAuth } from "./auth.server";
import type { SignedInUser } from "./discord-user.server";
import { account } from "./generated/auth.table";

const DISCORD_PROVIDER = "discord";
const CONNECTIONS_SCOPE = "connections";
const SIGN_IN_SCOPE = "identify";
const NO_TOKEN = Option.getOrNull(Option.none<string>());
const NO_EXPIRY = Option.getOrNull(Option.none<Date>());

type TokenOwner = Pick<SignedInUser, "userId" | "discordUserId">;

const ownAccount = ({ userId, discordUserId }: TokenOwner): SQL | undefined =>
  and(
    eq(account.userId, userId),
    eq(account.providerId, DISCORD_PROVIDER),
    eq(account.accountId, discordUserId),
  );

const grantsConnections = (scope: string | null): boolean =>
  Option.exists(Option.fromNullOr(scope), (granted) =>
    Array.contains(Str.split(/[\s,]+/u)(granted), CONNECTIONS_SCOPE),
  );

const dropOtherDiscordAccounts = ({ userId, discordUserId }: TokenOwner): Effect.Effect<void> =>
  Effect.promise(() =>
    db
      .delete(account)
      .where(
        and(
          eq(account.userId, userId),
          eq(account.providerId, DISCORD_PROVIDER),
          ne(account.accountId, discordUserId),
        ),
      ),
  ).pipe(Effect.asVoid);

const accessTokenOf =
  (userId: string) =>
  (accountId: string): Effect.Effect<Option.Option<string>> =>
    Effect.promise(() => getAuth().api.getAccessToken({ body: { accountId, userId } })).pipe(
      Effect.map(({ accessToken }) => Option.fromUndefinedOr(accessToken)),
    );

const connectionsTokenOf = (owner: TokenOwner): Effect.Effect<Option.Option<string>> =>
  dropOtherDiscordAccounts(owner).pipe(
    Effect.andThen(
      Effect.promise(() =>
        db.select({ id: account.id, scope: account.scope }).from(account).where(ownAccount(owner)),
      ),
    ),
    Effect.flatMap((rows) =>
      pipe(
        rows,
        Array.findFirst(({ scope }) => grantsConnections(scope)),
        Option.match({
          onNone: () => Effect.succeedNone,
          onSome: ({ id }) => accessTokenOf(owner.userId)(id),
        }),
      ),
    ),
    Effect.orElseSucceed(() => Option.none<string>()),
  );

const forgetConnectionsToken = (owner: TokenOwner): Effect.Effect<void> =>
  Effect.promise(() =>
    db
      .update(account)
      .set({
        accessToken: NO_TOKEN,
        refreshToken: NO_TOKEN,
        accessTokenExpiresAt: NO_EXPIRY,
        scope: SIGN_IN_SCOPE,
      })
      .where(ownAccount(owner)),
  ).pipe(Effect.asVoid);

export { connectionsTokenOf, forgetConnectionsToken };
export type { TokenOwner };
