import { Option } from "effect";
import { expect, it } from "vite-plus/test";

import { isInScope } from "./consent-scope";

const TEXT = "10";
const OTHER = "20";
const THREAD = "30";
const TOP_LEVEL = Option.getOrNull(Option.none<string>());

it("reads nothing before consent", () => {
  expect(isInScope({ status: "awaiting" }, { id: TEXT, parentId: TOP_LEVEL })).toBe(false);
});

it("reads only the chosen channels and their threads", () => {
  const scope = { status: "granted", channelIds: [TEXT] } as const;
  expect(isInScope(scope, { id: TEXT, parentId: TOP_LEVEL })).toBe(true);
  expect(isInScope(scope, { id: THREAD, parentId: TEXT })).toBe(true);
  expect(isInScope(scope, { id: OTHER, parentId: TOP_LEVEL })).toBe(false);
  expect(isInScope(scope, { id: THREAD, parentId: OTHER })).toBe(false);
});
