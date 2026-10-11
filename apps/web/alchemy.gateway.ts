import { Stack } from "alchemy";
import { providers as cloudflareProviders, state } from "alchemy/Cloudflare";
import { providers as flyProviders } from "alchemy/Fly";
import { Effect, Layer } from "effect";

import { Gateway } from "./gateway/service.ts";

const cloudflare = cloudflareProviders();

export default Stack(
  "gateway",
  { providers: flyProviders().pipe(Layer.provideMerge(cloudflare)), state: state() },
  Effect.gen(function* stack() {
    const { appName, region } = yield* Gateway;
    return { appName, region };
  }),
);
