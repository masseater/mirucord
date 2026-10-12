import { Stack } from "alchemy";
import { providers as cloudflareProviders, state } from "alchemy/Cloudflare";
import { providers as flyProviders, Secret } from "alchemy/Fly";
import { Config, Effect, Layer } from "effect";

import { BOT_TOKEN_SECRET, Gateway, GatewayApp } from "./src/app/service.ts";

const cloudflare = cloudflareProviders();

export default Stack(
  "gateway",
  { providers: flyProviders().pipe(Layer.provideMerge(cloudflare)), state: state() },
  Effect.gen(function* stack() {
    yield* Secret("DiscordBotToken", {
      app: GatewayApp,
      name: BOT_TOKEN_SECRET,
      value: yield* Config.Redacted(BOT_TOKEN_SECRET),
    });
    const { appName, region } = yield* Gateway;
    return { appName, region };
  }),
);
