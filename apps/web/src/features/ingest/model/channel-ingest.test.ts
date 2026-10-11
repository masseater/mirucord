import { Option } from "effect";
import { expect, it } from "vite-plus/test";

import { forumRowOf, ingestOf } from "./channel-ingest";
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

const FORUM = { botAccess: "readable" as const };
const DONE_POST: IngestRow = { ...row("readable", CHANNEL), backfill: "done" };

it("follows the posts of a forum", () => {
  const empty = forumRowOf(FORUM, []);
  const halfway = forumRowOf(FORUM, [DONE_POST, row("readable", EMPTY)]);
  const finished = forumRowOf(FORUM, [DONE_POST, DONE_POST]);
  expect(ingestOf(GRANTED, empty)).toBe("waiting");
  expect(ingestOf(GRANTED, halfway)).toBe("backfilling");
  expect(ingestOf(GRANTED, finished)).toBe("done");
  expect(ingestOf(AWAITING, finished)).toBe("awaiting");
});

it("pauses a forum the bot can no longer see", () => {
  const hidden = forumRowOf({ botAccess: "hidden" }, [DONE_POST]);
  expect(ingestOf(GRANTED, hidden)).toBe("paused");
});
