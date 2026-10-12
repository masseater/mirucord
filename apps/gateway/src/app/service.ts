import { NodeSocket } from "@effect/platform-node";
import type { GatewayJob } from "@repo/ingest-util-gateway-contract";
import { App, Service } from "alchemy/Fly";
import { ServerHost } from "alchemy/Server";
import { Discord, DiscordConfig } from "dfx";
import { DiscordGateway, DiscordLive } from "dfx/gateway";
import { Config, Effect, Filter, Layer, Redacted, Stream } from "effect";
import { FetchHttpClient } from "effect/http";

import { makeDeliver } from "./deliver";
import { mergeJobs, toGatewayJob } from "./gateway-job";

const GatewayApp = App("MirucordGatewayApp", { name: "mirucord-gateway-app" });

const BOT_TOKEN_SECRET = "DISCORD_BOT_TOKEN";
const FLUSH_EVENTS = 1000;
const FLUSH_INTERVAL = "5 seconds";
const INTENTS =
  Discord.GatewayIntentBits.Guilds +
  Discord.GatewayIntentBits.GuildMessages +
  Discord.GatewayIntentBits.MessageContent;

const mergeBatch = (batch: readonly GatewayJob[]): Effect.Effect<readonly GatewayJob[]> => {
  const merged = mergeJobs(batch);
  return Effect.logInfo("Gateway events merged").pipe(
    Effect.annotateLogs({ events: batch.length, jobs: merged.length }),
    Effect.as(merged),
  );
};

const gatewayLayer = (botToken: string): Layer.Layer<DiscordGateway> => {
  const token = Redacted.make(botToken);
  return DiscordLive.pipe(
    Layer.provide([
      DiscordConfig.layer({ token, gateway: { intents: INTENTS } }),
      FetchHttpClient.layer,
      NodeSocket.layerWebSocketConstructor,
    ]),
  );
};

const relayDispatch = (botToken: string): Effect.Effect<void, never, DiscordGateway> =>
  Effect.gen(function* relay() {
    const deliver = yield* makeDeliver(botToken);
    const gateway = yield* DiscordGateway;
    yield* gateway.dispatch.pipe(
      Stream.filterMap(Filter.fromPredicateOption(toGatewayJob)),
      Stream.groupedWithin(FLUSH_EVENTS, FLUSH_INTERVAL),
      Stream.mapEffect(mergeBatch),
      Stream.flattenIterable,
      Stream.runForEach(deliver),
    );
  }).pipe(Effect.scoped);

const runGateway = (botToken: string): Effect.Effect<never> =>
  Layer.effectDiscard(relayDispatch(botToken)).pipe(
    Layer.provide(gatewayLayer(botToken)),
    Layer.launch,
  );

class Gateway extends Service<Gateway>()(
  "MirucordGateway",
  {
    app: GatewayApp,
    name: "mirucord-gateway",
    main: import.meta.url,
    handler: "Gateway",
    region: "iad",
    services: [],
  },
  Effect.gen(function* gateway() {
    const host = yield* ServerHost;
    yield* host.run(
      Config.Redacted(BOT_TOKEN_SECRET).pipe(
        Effect.orDie,
        Effect.flatMap((botToken) => runGateway(Redacted.value(botToken))),
      ),
    );
    return {};
  }),
) {}

export { BOT_TOKEN_SECRET, Gateway, GatewayApp };
