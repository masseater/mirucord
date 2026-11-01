import { it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { expect } from "vite-plus/test";

import { mcpRejection } from "./throttle.server";

const NONE_ALLOWED = 0;
const NEXT = 1;
const TOO_MANY_REQUESTS = 429;

interface Exhausted {
  readonly allowed: number;
  readonly rejected: Response;
}

const exhaust = (request: Request, allowed: number): Effect.Effect<Exhausted> =>
  mcpRejection(request).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => exhaust(request, allowed + NEXT),
        onSome: (rejected) => Effect.succeed({ allowed, rejected }),
      }),
    ),
  );

const mcpRequest = (headers: Readonly<Record<string, string>>): Request =>
  new Request("https://example.test/mcp", { headers });

it.live("rejects MCP requests over the limit with 429", () =>
  Effect.gen(function* overLimit() {
    const { allowed, rejected } = yield* exhaust(
      mcpRequest({ authorization: "Bearer over-limit" }),
      NONE_ALLOWED,
    );
    expect(allowed).toBeGreaterThan(NONE_ALLOWED);
    expect(rejected.status).toBe(TOO_MANY_REQUESTS);
  }),
);

it.live("keys requests without a token by client IP", () =>
  Effect.gen(function* byClientIp() {
    yield* exhaust(mcpRequest({ "cf-connecting-ip": "192.0.2.1" }), NONE_ALLOWED);
    const sameIp = yield* mcpRejection(mcpRequest({ "cf-connecting-ip": "192.0.2.1" }));
    const otherIp = yield* mcpRejection(mcpRequest({ "cf-connecting-ip": "192.0.2.2" }));
    expect(Option.isSome(sameIp)).toBe(true);
    expect(Option.isNone(otherIp)).toBe(true);
  }),
);
