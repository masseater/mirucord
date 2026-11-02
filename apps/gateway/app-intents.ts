import { Resource } from "alchemy";
import { succeed as succeedProvider } from "alchemy/Provider";
import { ApplicationFlags } from "discord-api-types/v10";
import { Array, Config, Effect, Layer, Number, pipe, Redacted, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClientError } from "effect/http";

import { BOT_TOKEN_ENV } from "./src/app/service.ts";

const APP_INTENTS = "Mirucord.AppIntents";
const APPLICATION_URL = "https://discord.com/api/v10/applications/@me";
const NO_FLAGS = 0;
const BIT_BASE = 2;
const BIT_SET = 1;

const LIMITED_INTENTS = [
  ApplicationFlags.GatewayPresenceLimited,
  ApplicationFlags.GatewayGuildMembersLimited,
  ApplicationFlags.GatewayMessageContentLimited,
] as const;

const GATEWAY_INTENTS: readonly number[] = [
  ApplicationFlags.GatewayGuildMembersLimited,
  ApplicationFlags.GatewayMessageContentLimited,
];

type AppIntentsResource = Resource<
  typeof APP_INTENTS,
  Readonly<{ intents: readonly number[] }>,
  Readonly<{ intents: readonly number[] }>
>;

const AppIntents = Resource<AppIntentsResource>(APP_INTENTS);

const Application = Schema.Struct({ flags: Schema.optional(Schema.Finite) });

type BotCall = Effect.Effect<
  number,
  HttpClientError.HttpClientError | Schema.SchemaError | Config.ConfigError,
  HttpClient.HttpClient
>;

const hasFlag = (flags: number, flag: number): boolean =>
  Math.floor(flags / flag) % BIT_BASE === BIT_SET;

const limitedFlags = (wanted: (flag: number) => boolean): number =>
  Number.sumAll(pipe(LIMITED_INTENTS, Array.filter(wanted)));

const botRequest = (build: (url: string) => HttpClientRequest.HttpClientRequest): BotCall =>
  Effect.gen(function* call() {
    const token = yield* Config.Redacted(BOT_TOKEN_ENV);
    const authorization = { Authorization: `Bot ${Redacted.value(token)}` };
    const response = yield* HttpClient.execute(
      build(APPLICATION_URL).pipe(HttpClientRequest.setHeaders(authorization)),
    );
    const { flags } = yield* HttpClientResponse.filterStatusOk(response).pipe(
      Effect.flatMap(HttpClientResponse.schemaBodyJson(Application)),
    );
    return flags ?? NO_FLAGS;
  });

const setIntents = (wanted: (flag: number, current: number) => boolean): BotCall =>
  botRequest(HttpClientRequest.get).pipe(
    Effect.map((current) => limitedFlags((flag) => wanted(flag, current))),
    Effect.flatMap((flags) =>
      botRequest((url) =>
        HttpClientRequest.patch(url).pipe(HttpClientRequest.bodyJsonUnsafe({ flags })),
      ),
    ),
  );

const intentsProvider = succeedProvider(AppIntents, {
  diff: () => Effect.succeed({ action: "update" } as const),
  reconcile: ({ news }) =>
    setIntents((flag, current) => news.intents.includes(flag) || hasFlag(current, flag)).pipe(
      Effect.as({ intents: news.intents }),
    ),
  delete: ({ output }) =>
    Effect.asVoid(
      setIntents((flag, current) => !output.intents.includes(flag) && hasFlag(current, flag)),
    ),
});

const appIntents = AppIntents("AppIntents", { intents: GATEWAY_INTENTS });

const appIntentsProvider = intentsProvider.pipe(Layer.provide(FetchHttpClient.layer));

export { appIntents, appIntentsProvider };
