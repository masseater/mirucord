import { env } from "cloudflare:workers";
import { Effect, Option } from "effect";

import { RATE_LIMIT_PERIOD } from "./rate-limit";

type Limiter = "AUTH_RATE_LIMIT" | "MCP_RATE_LIMIT";

const TOO_MANY_REQUESTS = 429;

const tooManyRequests = (): Response =>
  new Response("Too Many Requests", {
    status: TOO_MANY_REQUESTS,
    headers: { "retry-after": String(RATE_LIMIT_PERIOD) },
  });

const clientIp = (request: Request): string =>
  Option.fromNullishOr(request.headers.get("cf-connecting-ip")).pipe(
    Option.getOrElse(() => "unknown"),
  );

const tokenOrIp = (request: Request): string =>
  Option.fromNullishOr(request.headers.get("authorization")).pipe(
    Option.getOrElse(() => `ip:${clientIp(request)}`),
  );

const rejection = (limiter: Limiter, key: string): Effect.Effect<Option.Option<Response>> =>
  Effect.promise(() => env[limiter].limit({ key })).pipe(
    Effect.map(({ success }) =>
      Option.liftPredicate(success, (allowed) => !allowed).pipe(Option.map(tooManyRequests)),
    ),
  );

const mcpRejection = (request: Request): Effect.Effect<Option.Option<Response>> =>
  rejection("MCP_RATE_LIMIT", tokenOrIp(request));

const authRejection = (request: Request): Effect.Effect<Option.Option<Response>> =>
  rejection("AUTH_RATE_LIMIT", clientIp(request));

export { authRejection, mcpRejection, tokenOrIp };
