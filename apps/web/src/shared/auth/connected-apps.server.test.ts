import { it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { expect } from "vite-plus/test";

import { db } from "#/shared/db/client.server";

import { disconnectApp, listConnectedApps } from "./connected-apps.server";
import {
  oauthAccessToken,
  oauthClient,
  oauthConsent,
  oauthRefreshToken,
  user,
} from "./generated/auth.table";

const SCOPES = ["openid"];

type Grant = Readonly<{ userId: string; clientId: string }>;

const seedUser = (id: string): Effect.Effect<void> =>
  Effect.promise(() =>
    db.insert(user).values({ id, name: id, email: `${id}@users.discord.invalid` }),
  ).pipe(Effect.asVoid);

const seedClient = (clientId: string, name: Option.Option<string>): Effect.Effect<void> =>
  Effect.promise(() =>
    db
      .insert(oauthClient)
      .values({ id: clientId, clientId, name: Option.getOrNull(name), redirectUris: [] }),
  ).pipe(Effect.asVoid);

const seedGrant = ({ userId, clientId }: Grant): Effect.Effect<void> => {
  const id = `${userId}-${clientId}`;
  return Effect.promise(() =>
    db.batch([
      db.insert(oauthConsent).values({ id, clientId, userId, scopes: SCOPES }),
      db
        .insert(oauthRefreshToken)
        .values({ id, token: `refresh-${id}`, clientId, userId, scopes: SCOPES }),
      db
        .insert(oauthAccessToken)
        .values({ id, token: `access-${id}`, clientId, userId, refreshId: id, scopes: SCOPES }),
    ]),
  ).pipe(Effect.asVoid);
};

const tokenCount = Effect.all({
  refresh: Effect.promise(() => db.select().from(oauthRefreshToken)),
  access: Effect.promise(() => db.select().from(oauthAccessToken)),
}).pipe(Effect.map(({ refresh, access }) => ({ refresh: refresh.length, access: access.length })));

it.effect("lists the apps a user connected, named by the client", () =>
  Effect.gen(function* listed() {
    yield* seedUser("u1");
    yield* seedClient("claude", Option.some("Claude"));
    yield* seedClient("nameless", Option.none());
    yield* seedGrant({ userId: "u1", clientId: "claude" });
    yield* seedGrant({ userId: "u1", clientId: "nameless" });
    const apps = yield* listConnectedApps("u1");
    expect(apps).toStrictEqual([
      { clientId: "claude", name: "Claude" },
      { clientId: "nameless", name: "nameless" },
    ]);
  }),
);

const seedGrants = (grants: readonly Grant[]): Effect.Effect<void> =>
  Effect.forEach(grants, seedGrant, { discard: true });

it.effect("disconnects one app of one user and keeps every other grant", () =>
  Effect.gen(function* disconnected() {
    yield* Effect.forEach(["u3", "u4"], seedUser, { discard: true });
    yield* seedClient("claude-2", Option.some("Claude"));
    yield* seedClient("other-2", Option.some("Other"));
    yield* seedGrants([
      { userId: "u3", clientId: "claude-2" },
      { userId: "u3", clientId: "other-2" },
      { userId: "u4", clientId: "claude-2" },
    ]);
    yield* disconnectApp({ userId: "u3", clientId: "claude-2" });
    expect(yield* listConnectedApps("u3")).toStrictEqual([{ clientId: "other-2", name: "Other" }]);
    expect(yield* listConnectedApps("u4")).toStrictEqual([
      { clientId: "claude-2", name: "Claude" },
    ]);
    expect(yield* tokenCount).toStrictEqual({ refresh: 4, access: 4 });
  }),
);
