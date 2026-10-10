import { DateTime, Duration } from "effect";
import { expect, it } from "vite-plus/test";

import { isPastRetention, observeAccess } from "./bot-access";
import type { BotAccess } from "./bot-access";

const HIDDEN_AT = DateTime.makeUnsafe("2026-10-01T00:00:00Z");
const LATER = DateTime.makeUnsafe("2026-10-05T00:00:00Z");
const HIDDEN: BotAccess = { status: "hidden", since: HIDDEN_AT };
const READABLE: BotAccess = { status: "readable" };
const RETENTION_DAYS = 30;
const ONE_DAY_SHORT = 29;

it("starts the clock when the bot loses sight of a channel", () => {
  expect(observeAccess({ readable: false, previous: READABLE, now: HIDDEN_AT })).toStrictEqual(
    HIDDEN,
  );
});

it("keeps the first hidden time while the channel stays hidden", () => {
  expect(observeAccess({ readable: false, previous: HIDDEN, now: LATER })).toStrictEqual(HIDDEN);
});

it("resumes as soon as the bot can read the channel again", () => {
  expect(observeAccess({ readable: true, previous: HIDDEN, now: LATER })).toStrictEqual(READABLE);
});

it("keeps stored messages until the retention period ends", () => {
  const almost = DateTime.addDuration(HIDDEN_AT, Duration.days(ONE_DAY_SHORT));
  const ended = DateTime.addDuration(HIDDEN_AT, Duration.days(RETENTION_DAYS));
  expect(isPastRetention(HIDDEN, almost)).toBe(false);
  expect(isPastRetention(HIDDEN, ended)).toBe(true);
  expect(isPastRetention(READABLE, ended)).toBe(false);
});
