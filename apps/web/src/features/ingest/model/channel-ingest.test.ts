import { Option } from "effect";
import { expect, it } from "vite-plus/test";

import { ingestOf } from "./channel-ingest";
import type { IngestRow } from "./channel-ingest";
import type { ConsentScope } from "./consent-scope";

const CHANNEL = "100";
const GRANTED: ConsentScope = { status: "granted" };
const AWAITING: ConsentScope = { status: "awaiting" };
const EMPTY = Option.getOrNull(Option.none<string>());

const row = (botAccess: "readable" | "hidden", newest: string | null): IngestRow => ({
  newest,
  backfill: "pending",
  botAccess,
});

it("pauses a channel the bot can no longer see after consent", () => {
  expect(ingestOf(GRANTED, row("hidden", CHANNEL))).toBe("paused");
});

it("tells a paused channel apart once its messages are gone", () => {
  expect(ingestOf(GRANTED, row("hidden", EMPTY))).toBe("cleared");
});

it("marks a hidden channel as unreadable before consent", () => {
  expect(ingestOf(AWAITING, row("hidden", EMPTY))).toBe("unreadable");
});

it("follows the backfill once consent covers a channel the bot can read", () => {
  expect(ingestOf(AWAITING, row("readable", EMPTY))).toBe("awaiting");
  expect(ingestOf(GRANTED, row("readable", EMPTY))).toBe("waiting");
  expect(ingestOf(GRANTED, row("readable", CHANNEL))).toBe("backfilling");
});
