import { createGatewayManager } from "@discordeno/gateway";
import { createRestManager } from "@discordeno/rest";
import { App, Service } from "alchemy/Fly";
import { ServerHost } from "alchemy/Server";
import { GatewayIntentBits } from "discord-api-types/v10";
import { Config, Effect, Option, Queue, Redacted, Stream } from "effect";

import { mergeJobs, toGatewayJob } from "#/features/ingest/index.gateway";
import type { GatewayJob } from "#/features/ingest/index.gateway";

import { makeDeliver } from "./deliver";

const GatewayApp = App("MirucordGatewayApp", { name: "mirucord-gateway-app" });

const NORMAL_CLOSURE = 1000;
const BOT_TOKEN_SECRET = "DISCORD_BOT_TOKEN";
const FLUSH_EVENTS = 1000;
const FLUSH_INTERVAL = "5 seconds";

const mergeBatch = (batch: readonly GatewayJob[]): Effect.Effect<readonly GatewayJob[]> => {
  const merged = mergeJobs(batch);
  return Effect.logInfo("Gateway events merged").pipe(
    Effect.annotateLogs({ events: batch.length, jobs: merged.length }),
    Effect.as(merged),
  );
};

const runGateway = (botToken: string): Effect.Effect<void> =>
  Effect.gen(function* connect() {
    const jobs = yield* Queue.unbounded<GatewayJob>();
    const deliver = yield* makeDeliver(botToken);
    const rest = createRestManager({ token: botToken });
    const connection = yield* Effect.promise(() => rest.getSessionInfo());
    const gateway = createGatewayManager({
      token: botToken,
      intents: GatewayIntentBits.Guilds + GatewayIntentBits.GuildMessages,
      connection,
      preferSnakeCase: true,
      events: {
        message: (_shard, payload) =>
          Option.match(toGatewayJob({ event: payload.t, data: payload.d }), {
            onNone: () => false,
            onSome: (job) => Queue.offerUnsafe(jobs, job),
          }),
      },
    });
    yield* Effect.acquireRelease(
      Effect.promise(() => gateway.spawnShards()),
      () => Effect.promise(() => gateway.shutdown(NORMAL_CLOSURE, "Gateway stopped")),
    );
    yield* Stream.fromQueue(jobs).pipe(
      Stream.groupedWithin(FLUSH_EVENTS, FLUSH_INTERVAL),
      Stream.mapEffect(mergeBatch),
      Stream.flattenIterable,
      Stream.runForEach(deliver),
    );
  }).pipe(Effect.scoped);

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
