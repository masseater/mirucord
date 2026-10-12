import { createRestManager } from "@discordeno/rest";
import type { RequestMethods } from "@discordeno/rest";
import { env } from "cloudflare:workers";
import type {
  RESTPostAPIChannelMessageJSONBody,
  RESTPostAPICurrentUserCreateDMChannelJSONBody,
  RESTPostAPIWebhookWithTokenJSONBody,
} from "discord-api-types/v10";
import { Data, Effect, Option, Schema } from "effect";
import type { ReadonlyDeep } from "type-fest";

class DiscordRequestError extends Data.TaggedError("DiscordRequestError")<{
  readonly status: Option.Option<number>;
  readonly cause: unknown;
}> {}

const RequestFailure = Schema.Struct({ cause: Schema.Struct({ status: Schema.Finite }) });
const decodeRequestFailure = Schema.decodeUnknownOption(RequestFailure);

const rest = createRestManager({ token: env.DISCORD_BOT_TOKEN });

type DiscordRequestBody = ReadonlyDeep<
  | RESTPostAPIChannelMessageJSONBody
  | RESTPostAPICurrentUserCreateDMChannelJSONBody
  | RESTPostAPIWebhookWithTokenJSONBody
>;

type DiscordRequest = Readonly<{
  method: RequestMethods;
  route: string;
  options?: Readonly<{ body: DiscordRequestBody; unauthorized: boolean }>;
}>;

const callDiscord =
  <Result>() =>
  <Type, DecodingServices>(
    decode: (result: Result) => Effect.Effect<Type, Schema.SchemaError, DecodingServices>,
  ) =>
  ({
    method,
    route,
    options,
  }: DiscordRequest): Effect.Effect<Type, DiscordRequestError, DecodingServices> =>
    Effect.tryPromise({
      try: () => rest.makeRequest<Result>(method, route, { ...options, runThroughQueue: false }),
      catch: (cause) =>
        new DiscordRequestError({
          status: decodeRequestFailure(cause).pipe(Option.map((failure) => failure.cause.status)),
          cause,
        }),
    }).pipe(Effect.flatMap((body) => decode(body).pipe(Effect.orDie)));

export { callDiscord, DiscordRequestError };
export type { DiscordRequest, DiscordRequestBody };
