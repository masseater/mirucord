import { ApiToken, CloudflareEnvironment, Zone, providers, state } from "@alchemy.run/cloudflare";
import { Secrets, Variables, providers as gitHubProviders } from "@alchemy.run/github";
import { PREFIX, requireAppPrefix } from "@repo/shared-util-app-name";
import { Stack } from "alchemy";
import type { CompiledStack } from "alchemy";
import { Config, Effect, Layer, Schema } from "effect";
import type { ConfigError } from "effect/Config";

import { FREE_GUILD_LIMIT } from "./src/shared/config/plan.ts";
import { SITE_HOST } from "./src/shared/config/site.ts";

const repo = { owner: "masseater", repository: "mirucord" };
const NonEmptySecret = Schema.Redacted(Schema.NonEmptyString);

const siteZone = Effect.gen(function* siteZone() {
  const { accountId } = yield* yield* CloudflareEnvironment;
  const zoneId = yield* Zone.resolveZoneId({
    accountId,
    zone: SITE_HOST,
    hostname: SITE_HOST,
  }).pipe(Effect.orDie);
  return { accountId, zoneId };
});

const observerToken = Effect.gen(function* observerToken() {
  const { accountId, zoneId } = yield* siteZone;
  return yield* ApiToken.AccountApiToken("ObserverToken", {
    name: `${PREFIX}observer`,
    accountId,
    policies: [
      {
        effect: "allow",
        permissionGroups: [
          "D1 Read",
          "Vectorize Read",
          "Workers Scripts Read",
          "Workers Observability Write",
          "Account Analytics Read",
          "Account Rulesets Read",
          "Account Rule Lists Read",
          "Logs Read",
          "Workers R2 Storage Read",
        ],
        resources: { [`com.cloudflare.api.account.${accountId}`]: "*" },
      },
      {
        effect: "allow",
        permissionGroups: ["Analytics Read", "Zone WAF Read"],
        resources: { [`com.cloudflare.api.account.zone.${zoneId}`]: "*" },
      },
    ],
  });
});

const ci: Effect.Effect<CompiledStack, ConfigError> & Readonly<{ stackName: string }> = Stack(
  `${PREFIX}ci`,
  { providers: Layer.mergeAll(providers(), gitHubProviders()), state: state() },
  Effect.gen(function* stack() {
    const observer = yield* observerToken;
    yield* Secrets({
      ...repo,
      secrets: {
        DISCORD_CLIENT_SECRET: Config.schema(NonEmptySecret, "DISCORD_CLIENT_SECRET"),
        DISCORD_BOT_TOKEN: Config.schema(NonEmptySecret, "DISCORD_BOT_TOKEN"),
        OPENROUTER_API_KEY: Config.schema(NonEmptySecret, "OPENROUTER_API_KEY"),
      },
    });
    yield* Variables({
      ...repo,
      variables: {
        DISCORD_CLIENT_ID: Config.NonEmptyString("DISCORD_CLIENT_ID"),
        MAX_GUILDS: String(FREE_GUILD_LIMIT),
      },
    });
    yield* requireAppPrefix;
    return { observerTokenId: observer.tokenId };
  }),
);

export default ci;
