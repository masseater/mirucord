import { Stack } from "alchemy";
import type { CompiledStack } from "alchemy";
import { ApiToken, CloudflareEnvironment, Zone, providers, state } from "alchemy/Cloudflare";
import { Secrets, Variables, providers as gitHubProviders } from "alchemy/GitHub";
import { Config, Effect, Layer, Schema } from "effect";
import type { ConfigError } from "effect/Config";

import { PREFIX } from "./app-name.ts";
import { FREE_GUILD_LIMIT } from "./src/shared/config/plan.ts";
import { SITE_HOST } from "./src/shared/config/site.ts";

const repo = { owner: "masseater", repository: "mirucord" };
const NonEmptySecret = Schema.Redacted(Schema.NonEmptyString);

const deployToken = Effect.gen(function* deployToken() {
  const { accountId } = yield* yield* CloudflareEnvironment;
  const zoneId = yield* Zone.resolveZoneId({
    accountId,
    zone: SITE_HOST,
    hostname: SITE_HOST,
  }).pipe(Effect.orDie);
  const token = yield* ApiToken.AccountApiToken("DeployToken", {
    name: `${PREFIX}deploy`,
    accountId,
    policies: [
      {
        effect: "allow",
        permissionGroups: [
          "Workers Scripts Write",
          "Secrets Store Write",
          "D1 Write",
          "Vectorize Write",
          "Queues Write",
          "Workers R2 Storage Write",
          "Workers Observability Write",
          "Workers AI Read",
          "Account Settings Read",
        ],
        resources: { [`com.cloudflare.api.account.${accountId}`]: "*" },
      },
      {
        effect: "allow",
        permissionGroups: ["Workers Routes Write", "DNS Write", "Zone Read"],
        resources: { [`com.cloudflare.api.account.zone.${zoneId}`]: "*" },
      },
    ],
  });
  return { accountId, token };
});

const observerToken = Effect.gen(function* observerToken() {
  const { accountId } = yield* yield* CloudflareEnvironment;
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
        ],
        resources: { [`com.cloudflare.api.account.${accountId}`]: "*" },
      },
    ],
  });
});

const ci: Effect.Effect<CompiledStack, ConfigError> & Readonly<{ stackName: string }> = Stack(
  "ci",
  { providers: Layer.mergeAll(providers(), gitHubProviders()), state: state() },
  Effect.gen(function* stack() {
    const { accountId, token } = yield* deployToken;
    const observer = yield* observerToken;
    yield* Secrets({
      ...repo,
      secrets: {
        CLOUDFLARE_API_TOKEN: token.value,
        CLOUDFLARE_ACCOUNT_ID: accountId,
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
    return { tokenId: token.tokenId, observerTokenId: observer.tokenId };
  }),
);

export default ci;
