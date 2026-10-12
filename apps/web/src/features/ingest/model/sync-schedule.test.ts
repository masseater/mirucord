import { Array, DateTime } from "effect";
import { expect, it } from "vite-plus/test";

import { isPollDue } from "./sync-schedule";

const HOURS = 24;
const DUE_HOURS = 1;
const GUILD = "1234567890123456789";
const MIDNIGHT = DateTime.makeUnsafe("2026-10-12T00:32:00Z");

it("polls each server in exactly one hour of the day", () => {
  const due = Array.makeBy(HOURS, (hours) =>
    isPollDue({ guildId: GUILD, now: DateTime.add(MIDNIGHT, { hours }) }),
  );
  expect(due.filter(Boolean)).toHaveLength(DUE_HOURS);
});
