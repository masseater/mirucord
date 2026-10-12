import { expect, it } from "vite-plus/test";

import { searchKeyOf } from "./search-key";

const EARLIER = "1557624521786138727";
const SAME_MILLISECOND = "1557624521786138728";
const LATER = "1558988135612817419";

it("orders keys by when the message was posted", () => {
  expect(searchKeyOf(EARLIER)).toBeLessThan(searchKeyOf(SAME_MILLISECOND));
  expect(searchKeyOf(SAME_MILLISECOND)).toBeLessThan(searchKeyOf(LATER));
});

it("keeps keys within the integers JavaScript holds exactly", () => {
  expect(Number.isSafeInteger(searchKeyOf(LATER))).toBe(true);
});
