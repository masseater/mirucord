import { env } from "cloudflare:workers";
import { DiscordConfig, DiscordREST, DiscordRESTMemoryLive } from "dfx";
import type { DiscordRestService } from "dfx/DiscordREST";
import { Context, Effect, Layer, ManagedRuntime, Option, Redacted, Schema } from "effect";
import { FetchHttpClient } from "effect/http";
import type { ReadonlyDeep } from "type-fest";

const taggedError = Schema.TaggedError;

class DiscordRequestError extends taggedError<
  DiscordRequestError,
  { readonly brand: unique symbol }
>()("DiscordRequestError", {
  status: Schema.Option(Schema.Finite),
  cause: Schema.Unknown,
}) {}

type DiscordFailure = Readonly<{ response?: Readonly<{ status: number }> | undefined }>;

const BotConfig = DiscordConfig.layer({ token: Redacted.make(env.DISCORD_BOT_TOKEN) });

const DiscordLive = DiscordRESTMemoryLive.pipe(Layer.provide([BotConfig, FetchHttpClient.layer]));

const discordRuntime = ManagedRuntime.make(DiscordLive);

const discordRest = discordRuntime.contextEffect.pipe(
  Effect.map((context) => Context.get(context, DiscordREST)),
);

const requestErrorOf = (cause: DiscordFailure): DiscordRequestError =>
  DiscordRequestError.make({
    status: Option.fromUndefinedOr(cause.response).pipe(Option.map(({ status }) => status)),
    cause,
  });

const withDiscord = <Found>(
  request: (rest: ReadonlyDeep<DiscordRestService>) => Effect.Effect<Found, DiscordFailure>,
): Effect.Effect<Found, DiscordRequestError> =>
  discordRest.pipe(Effect.flatMap(request), Effect.mapError(requestErrorOf));

const decodeBody =
  <Body extends Schema.Top>(schema: Body) =>
  (raw: Body["Encoded"]): Effect.Effect<Body["Type"], never, Body["DecodingServices"]> =>
    Effect.orDie(Schema.decodeEffect(schema)(raw));

export { decodeBody, DiscordRequestError, withDiscord };
export type { DiscordFailure };
