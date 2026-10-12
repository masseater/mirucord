import { it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { expect } from "vite-plus/test";

import { mcpRejection, tokenOrIp } from "./throttle.server";

const TOO_MANY_REQUESTS = 429;

it.live("rejects requests over the limit with 429", () =>
  Effect.gen(function* overLimit() {
    const request = new Request("https://example.test/mcp", {
      headers: { authorization: "Bearer over-limit" },
    });
    const first = yield* mcpRejection(request);
    const second = yield* mcpRejection(request);
    expect(Option.isNone(first)).toBe(true);
    expect(second.pipe(Option.map(({ status }) => status))).toStrictEqual(
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
