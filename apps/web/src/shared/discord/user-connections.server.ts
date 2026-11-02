import { env } from "cloudflare:workers";
import { Discord } from "dfx";
import { OAuth2Routes, RouteBases, Routes } from "discord-api-types/v10";
import { Array, Effect, Layer, Option, pipe, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClientError } from "effect/http";

import { requestErrorOf } from "./client.server";
import type { DiscordRequestError } from "./client.server";

type PublicConnection = Readonly<{ type: string; name: string; verified: boolean }>;

const Connection = Schema.Struct({
  type: Schema.String,
  name: Schema.NullOr(Schema.String),
  verified: Schema.Boolean,
  visibility: Schema.Int,
  revoked: Schema.optional(Schema.Boolean),
});

type ConnectionRow = typeof Connection.Type;

const decodeConnections = Schema.decodeUnknownEffect(Schema.Array(Connection));

const isPublic = ({ visibility, revoked }: ConnectionRow): boolean =>
  visibility === Discord.ConnectedAccountVisibility.EVERYONE && revoked !== true;

const publicOf = ({ type, name, verified }: ConnectionRow): readonly PublicConnection[] =>
  Option.match(Option.fromNullOr(name), {
    onNone: () => [],
    onSome: (shown) => [{ type, name: shown, verified }],
  });

const FORM = "application/x-www-form-urlencoded";

const withClient = <Value>(
  call: Effect.Effect<Value, HttpClientError.HttpClientError, HttpClient.HttpClient>,
): Effect.Effect<Value, DiscordRequestError> =>
  Effect.scoped(
    Layer.build(FetchHttpClient.layer).pipe(
      Effect.flatMap((context) => call.pipe(Effect.provideContext(context))),
    ),
  ).pipe(Effect.mapError((cause) => requestErrorOf({ response: cause.response })));

const listPublicConnections = (
  accessToken: string,
): Effect.Effect<readonly PublicConnection[], DiscordRequestError> => {
  const request = HttpClientRequest.get(`${RouteBases.api}${Routes.userConnections()}`).pipe(
    HttpClientRequest.setHeaders({ authorization: `Bearer ${accessToken}` }),
  );
  return request.pipe(
    HttpClient.execute,
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap((response) => response.json),
    withClient,
    Effect.flatMap((body) => Effect.orDie(decodeConnections(body))),
    Effect.map((connections) => pipe(connections, Array.filter(isPublic), Array.flatMap(publicOf))),
    Effect.withSpan("listPublicConnections"),
  );
};

const revokeUserToken = (accessToken: string): Effect.Effect<void, DiscordRequestError> => {
  const form = new URLSearchParams({
    token: accessToken,
    token_type_hint: "access_token",
    client_id: env.DISCORD_CLIENT_ID,
    client_secret: env.DISCORD_CLIENT_SECRET,
  });
  const request = HttpClientRequest.post(OAuth2Routes.tokenRevocationURL).pipe(
    HttpClientRequest.bodyText(form.toString(), FORM),
  );
  return withClient(
    HttpClient.execute(request).pipe(Effect.flatMap(HttpClientResponse.filterStatusOk)),
  ).pipe(Effect.asVoid, Effect.withSpan("revokeUserToken"));
};

export { listPublicConnections, revokeUserToken };
export type { PublicConnection };
