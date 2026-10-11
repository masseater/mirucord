import { and, eq, max } from "drizzle-orm";
import { Effect, Option } from "effect";

import { db } from "#/shared/db/client.server";

import {
  oauthAccessToken,
  oauthClient,
  oauthConsent,
  oauthRefreshToken,
} from "./generated/auth.table";

type ConnectedApp = Readonly<{
  clientId: string;
  name: string;
  connectedAt: number | null;
  updatedAt: number | null;
}>;

type AppGrant = Readonly<{ userId: string; clientId: string }>;

type Instant = Readonly<{ getTime: () => number }>;

const epochOf = (date: Instant | null): number | null =>
  Option.getOrNull(Option.map(Option.fromNullOr(date), (value) => value.getTime()));

const listConnectedApps = (userId: string): Effect.Effect<readonly ConnectedApp[]> => {
  const latestRefresh = db
    .select({
      clientId: oauthRefreshToken.clientId,
      refreshedAt: max(oauthRefreshToken.createdAt).as("refreshed_at"),
    })
    .from(oauthRefreshToken)
    .where(eq(oauthRefreshToken.userId, userId))
    .groupBy(oauthRefreshToken.clientId)
    .as("latest_refresh");
  return Effect.promise(() =>
    db
      .select({
        clientId: oauthConsent.clientId,
        name: oauthClient.name,
        connectedAt: oauthConsent.createdAt,
        consentUpdatedAt: oauthConsent.updatedAt,
        refreshedAt: latestRefresh.refreshedAt,
      })
      .from(oauthConsent)
      .innerJoin(oauthClient, eq(oauthClient.clientId, oauthConsent.clientId))
      .leftJoin(latestRefresh, eq(latestRefresh.clientId, oauthConsent.clientId))
      .where(eq(oauthConsent.userId, userId)),
  ).pipe(
    Effect.map((rows) =>
      rows.map(({ clientId, name, connectedAt, consentUpdatedAt, refreshedAt }) => ({
        clientId,
        name: Option.getOrElse(Option.fromNullOr(name), () => clientId),
        connectedAt: epochOf(connectedAt),
        updatedAt: epochOf(refreshedAt ?? consentUpdatedAt),
      })),
    ),
  );
};

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
