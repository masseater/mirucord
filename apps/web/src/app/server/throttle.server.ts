import { env } from "cloudflare:workers";
import { Array, Effect, Option } from "effect";

import { AUTH_RATE_LIMIT, MCP_RATE_LIMIT, RATE_LIMIT_PERIOD } from "./rate-limit";

type RateLimit = typeof AUTH_RATE_LIMIT | typeof MCP_RATE_LIMIT;

const TOO_MANY_REQUESTS = 429;
const HEX_RADIX = 16;
const HEX_WIDTH = 2;

const textEncoder = new TextEncoder();

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

const digestOf = (key: string): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.digest("SHA-256", textEncoder.encode(key))).pipe(
    Effect.map((digest) =>
      Array.fromIterable(new Uint8Array(digest))
        .map((byte) => byte.toString(HEX_RADIX).padStart(HEX_WIDTH, "0"))
        .join(""),
    ),
  );

const rejection = (
  { limit, period }: RateLimit,
  key: string,
): Effect.Effect<Option.Option<Response>> =>
  digestOf(key).pipe(
    Effect.flatMap((name) =>
      Effect.promise(() => env.REQUEST_COUNTER.getByName(name).hit(limit, period)),
    ),
    Effect.map((allowed) =>
      Option.liftPredicate(allowed, (passed) => !passed).pipe(Option.map(tooManyRequests)),
    ),
  );

const mcpRejection = (request: Request): Effect.Effect<Option.Option<Response>> =>
  rejection(MCP_RATE_LIMIT, `mcp:${tokenOrIp(request)}`);

const authRejection = (request: Request): Effect.Effect<Option.Option<Response>> =>
  rejection(AUTH_RATE_LIMIT, `auth:${clientIp(request)}`);

export { authRejection, mcpRejection, tokenOrIp };
