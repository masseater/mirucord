import { env } from "cloudflare:workers";
import { Array, Effect, Option, pipe, String as Str } from "effect";

const RATE_LIMIT_PERIOD = 60;

const MCP_RATE_LIMIT = { limit: 600, period: RATE_LIMIT_PERIOD } as const;
const AUTH_RATE_LIMIT = { limit: 3000, period: RATE_LIMIT_PERIOD } as const;

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
      pipe(
        Array.fromIterable(new Uint8Array(digest)),
        Array.map((byte) => pipe(byte.toString(HEX_RADIX), Str.padStart(HEX_WIDTH, "0"))),
        Array.join(""),
      ),
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

export { authRejection, MCP_RATE_LIMIT, mcpRejection, tokenOrIp };
