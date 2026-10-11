import { and, eq } from "drizzle-orm";
import { Effect, Option } from "effect";

import { db } from "#/shared/db/client.server";

import {
  oauthAccessToken,
  oauthClient,
  oauthConsent,
  oauthRefreshToken,
} from "./generated/auth.table";

type ConnectedApp = Readonly<{ clientId: string; name: string }>;

type AppGrant = Readonly<{ userId: string; clientId: string }>;

const listConnectedApps = (userId: string): Effect.Effect<readonly ConnectedApp[]> =>
  Effect.promise(() =>
    db
      .select({
        clientId: oauthConsent.clientId,
        name: oauthClient.name,
      })
      .from(oauthConsent)
      .innerJoin(oauthClient, eq(oauthClient.clientId, oauthConsent.clientId))
      .where(eq(oauthConsent.userId, userId)),
  ).pipe(
    Effect.map((rows) =>
      rows.map(({ clientId, name }) => ({
        clientId,
        name: Option.getOrElse(Option.fromNullOr(name), () => clientId),
      })),
    ),
  );

const disconnectApp = ({ userId, clientId }: AppGrant): Effect.Effect<void> => {
  const refreshTokens = and(
    eq(oauthRefreshToken.userId, userId),
    eq(oauthRefreshToken.clientId, clientId),
  );
  const accessTokens = and(
    eq(oauthAccessToken.userId, userId),
    eq(oauthAccessToken.clientId, clientId),
  );
  const consents = and(eq(oauthConsent.userId, userId), eq(oauthConsent.clientId, clientId));
  return Effect.promise(() =>
    db.batch([
      db.delete(oauthRefreshToken).where(refreshTokens),
      db.delete(oauthAccessToken).where(accessTokens),
      db.delete(oauthConsent).where(consents),
    ]),
  ).pipe(Effect.asVoid);
};

export { disconnectApp, listConnectedApps };
export type { AppGrant, ConnectedApp };
