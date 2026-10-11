import { createGatewayManager } from "@discordeno/gateway";
import { createRestManager } from "@discordeno/rest";
import { Service } from "alchemy/Fly";
import { ServerHost } from "alchemy/Server";
import { GatewayIntentBits } from "discord-api-types/v10";
import { Config, Effect, Option, Queue, Redacted, Stream } from "effect";

import { toGatewayJob } from "#/features/ingest";
import type { GatewayJob } from "#/features/ingest";

import { makeDeliver } from "./deliver";

const APP_NAME = "mirucord-gateway";

const NORMAL_CLOSURE = 1000;

const runGateway = (botToken: string): Effect.Effect<void> =>
  Effect.gen(function* connect() {
    const jobs = yield* Queue.unbounded<GatewayJob>();
    const deliver = yield* makeDeliver(botToken);
    const rest = createRestManager({ token: botToken });
    const connection = yield* Effect.promise(() => rest.getSessionInfo());
    const gateway = createGatewayManager({
      token: botToken,
      intents: GatewayIntentBits.GuildMessages,
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
    yield* Stream.fromQueue(jobs).pipe(Stream.runForEach(deliver));
  }).pipe(Effect.scoped);

class Gateway extends Service<Gateway>()(
  "Gateway",
  {
    name: APP_NAME,
    main: import.meta.url,
    handler: "Gateway",
    region: "iad",
    services: [],
  },
  Effect.gen(function* gateway() {
    const host = yield* ServerHost;
    const botToken = yield* Config.Redacted("DISCORD_BOT_TOKEN").pipe(Effect.orDie);
    yield* host.run(runGateway(Redacted.value(botToken)));
    return {};
  }),
) {}

export { Gateway };
