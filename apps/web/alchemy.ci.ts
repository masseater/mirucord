import { Stack } from "alchemy";
import { ApiToken, CloudflareEnvironment, Zone, providers, state } from "alchemy/Cloudflare";
import { Secrets, Variables, providers as gitHubProviders } from "alchemy/GitHub";
import { Config, Effect, Layer, Schema } from "effect";

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
    name: "mirucord-deploy",
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

export default Stack(
  "ci",
  { providers: Layer.mergeAll(providers(), gitHubProviders()), state: state() },
  Effect.gen(function* stack() {
    const { accountId, token } = yield* deployToken;
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
      variables: { DISCORD_CLIENT_ID: Config.NonEmptyString("DISCORD_CLIENT_ID") },
    });
    return { tokenId: token.tokenId };
  }),
);
