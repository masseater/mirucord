import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import type { Auth, BetterAuthOptions } from "better-auth";
import { jwt } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { env } from "cloudflare:workers";

import { MCP_URL, SITE_ORIGIN } from "#/shared/config";
import { db } from "#/shared/db/client.server";

import {
  account,
  authRelations,
  jwks,
  oauthAccessToken,
  oauthClient,
  oauthClientAssertion,
  oauthClientResource,
  oauthConsent,
  oauthRefreshToken,
  oauthResource,
  session,
  user,
  verification,
} from "./generated/auth.table";

type AuthOptions = BetterAuthOptions & {
  plugins: [
    ReturnType<typeof tanstackStartCookies>,
    ReturnType<typeof jwt>,
    ReturnType<typeof mcp>,
  ];
};

const makeAuth = (): Auth<AuthOptions> =>
  betterAuth<AuthOptions>({
    baseURL: SITE_ORIGIN,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        account,
        authRelations,
        jwks,
        oauthAccessToken,
        oauthClient,
        oauthClientAssertion,
        oauthClientResource,
        oauthConsent,
        oauthRefreshToken,
        oauthResource,
        session,
        user,
        verification,
      },
    }),
    disabledPaths: ["/token"],
    socialProviders: {
      discord: {
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
        disableDefaultScope: true,
        scope: ["identify"],
        mapProfileToUser: (profile) => ({
          name: profile.global_name ?? profile.username,
          email: `${profile.id}@users.discord.invalid`,
          emailVerified: false,
        }),
      },
    },
    plugins: [
      tanstackStartCookies(),
      jwt(),
      mcp({
        loginPage: "/sign-in",
        consentPage: "/mcp/consent",
        resource: MCP_URL,
        scopes: ["openid", "profile", "offline_access"],
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
      }),
    ],
    secret: env.BETTER_AUTH_SECRET,
  });

export { makeAuth };
export type { AuthOptions };
