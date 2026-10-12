import { it } from "@effect/vitest";
import { Array, Effect, Option } from "effect";
import { expect } from "vite-plus/test";

import { MCP_RATE_LIMIT, mcpRejection, tokenOrIp } from "./throttle.server";

const FIRST_ATTEMPT = 1;
const TOO_MANY_REQUESTS = 429;

it.live("rejects MCP requests over the limit with 429", () =>
  Effect.gen(function* overLimit() {
    const request = new Request("https://example.test/mcp", {
      headers: { authorization: "Bearer over-limit" },
    });
    const allowed = yield* Effect.forEach(
      Array.range(FIRST_ATTEMPT, MCP_RATE_LIMIT.limit),
      () => mcpRejection(request),
      { concurrency: "unbounded" },
    );
    const over = yield* mcpRejection(request);
    expect(Array.getSomes(allowed)).toStrictEqual([]);
    expect(over.pipe(Option.map(({ status }) => status))).toStrictEqual(
      Option.some(TOO_MANY_REQUESTS),
    );
  }),
);

it("keys requests without a token by client IP", () => {
  const request = new Request("https://example.test/mcp", {
    headers: { "cf-connecting-ip": "192.0.2.1" },
  });
  expect(tokenOrIp(request)).toBe("ip:192.0.2.1");
});
