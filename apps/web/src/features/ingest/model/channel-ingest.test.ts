import { Option } from "effect";
import { expect, it } from "vite-plus/test";

import { ingestOf } from "./channel-ingest";
import type { IngestRow } from "./channel-ingest";
import type { ConsentScope } from "./consent-scope";

const CHANNEL = "100";
const GRANTED: ConsentScope = { status: "granted", channelIds: [CHANNEL] };
const AWAITING: ConsentScope = { status: "awaiting" };
const NO_PARENT = Option.getOrNull(Option.none<string>());

const row = (botAccess: "readable" | "hidden", newest: string | null): IngestRow => ({
  id: CHANNEL,
  parentId: NO_PARENT,
  newest,
  backfill: "pending",
  botAccess,
});

it("pauses a chosen channel the bot can no longer see", () => {
  expect(ingestOf(GRANTED, row("hidden", CHANNEL))).toBe("paused");
});

it("marks a hidden channel nobody chose as unreadable", () => {
  expect(ingestOf(AWAITING, row("hidden", NO_PARENT))).toBe("unreadable");
});

it("follows the backfill once the bot can read a chosen channel", () => {
  expect(ingestOf(AWAITING, row("readable", NO_PARENT))).toBe("excluded");
  expect(ingestOf(GRANTED, row("readable", NO_PARENT))).toBe("waiting");
  expect(ingestOf(GRANTED, row("readable", CHANNEL))).toBe("backfilling");
});
