import { createRestManager } from "@discordeno/rest";
import type { RequestMethods } from "@discordeno/rest";
import { env } from "cloudflare:workers";
import { Data, Effect, Option, Schema } from "effect";

class DiscordRequestError extends Data.TaggedError("DiscordRequestError")<{
  readonly status: Option.Option<number>;
  readonly cause: unknown;
}> {}

const RequestFailure = Schema.Struct({ cause: Schema.Struct({ status: Schema.Finite }) });
const decodeRequestFailure = Schema.decodeUnknownOption(RequestFailure);

const rest = createRestManager({ token: env.DISCORD_BOT_TOKEN });

type DiscordRequest = Readonly<{
  method: RequestMethods;
  route: string;
  options?: Readonly<{ body: unknown; unauthorized: boolean }>;
}>;

const callDiscord =
  <Raw>() =>
  <Body extends Schema.Top>(
    schema: Body,
    ..._rawMustDecode: [Raw] extends [Body["Encoded"]] ? readonly [] : readonly [never]
  ) =>
  ({
    method,
    route,
    options,
  }: DiscordRequest): Effect.Effect<Body["Type"], DiscordRequestError, Body["DecodingServices"]> =>
    Effect.tryPromise({
      try: () => rest.makeRequest<Raw>(method, route, { ...options, runThroughQueue: false }),
      catch: (cause) =>
        new DiscordRequestError({
          status: decodeRequestFailure(cause).pipe(Option.map((failure) => failure.cause.status)),
          cause,
        }),
    }).pipe(Effect.flatMap((body) => Schema.decodeUnknownEffect(schema)(body).pipe(Effect.orDie)));

export { callDiscord, DiscordRequestError };
export type { DiscordRequest };
