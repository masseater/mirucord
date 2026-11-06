import { providers as cloudflareProviders, state } from "@alchemy.run/cloudflare";
import { providers as flyProviders, Secret } from "@alchemy.run/fly";
import { PREFIX, requireAppPrefix } from "@repo/shared-util-app-name";
import { Stack } from "alchemy";
import { Config, Effect, Layer } from "effect";

import { appIntents, appIntentsProvider } from "./app-intents.ts";
import { BOT_TOKEN_ENV, BOT_TOKEN_SECRET, Gateway, GatewayApp } from "./src/app/gateway-service.ts";

const cloudflare = cloudflareProviders();
const fly = flyProviders();

export default Stack(
  `${PREFIX}gateway`,
  {
    providers: appIntentsProvider.pipe(Layer.provideMerge(fly), Layer.provideMerge(cloudflare)),
    state: state(),
  },
  Effect.gen(function* stack() {
    yield* Secret("DiscordBotToken", {
      app: GatewayApp,
      name: BOT_TOKEN_SECRET,
      value: yield* Config.Redacted(BOT_TOKEN_ENV),
    });
    yield* appIntents;
    const { appName, region } = yield* Gateway;
    yield* requireAppPrefix;
    return { appName, region };
  }),
);
