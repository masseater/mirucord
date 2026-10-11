import { Option } from "effect";
import { expect, it } from "vite-plus/test";

import { ingestStatus } from "./ingest-status";
import type { ChannelProgress } from "./ingest-status";

const STORED: ChannelProgress = { newest: Option.some("100"), backfill: "done" };
const EMPTY: ChannelProgress = { newest: Option.none(), backfill: "done" };
const PARTIAL: ChannelProgress = { newest: Option.some("100"), backfill: "pending" };
const UNTOUCHED: ChannelProgress = { newest: Option.none(), backfill: "pending" };

const channel = (progress: ChannelProgress): string =>
  ingestStatus({ consent: "consented", kind: "channel", progress });

const forum = (posts: readonly ChannelProgress[]): string =>
  ingestStatus({ consent: "consented", kind: "forum", posts });

it("reports nothing as stored before the server consents", () => {
  expect(ingestStatus({ consent: "notConsented", kind: "channel", progress: STORED })).toBe(
    "notConsented",
  );
  expect(ingestStatus({ consent: "notConsented", kind: "forum", posts: [STORED] })).toBe(
    "notConsented",
  );
});

it("calls a channel empty only after its backfill found no messages", () => {
  expect([STORED, EMPTY, PARTIAL, UNTOUCHED].map((progress) => channel(progress))).toStrictEqual([
    "done",
    "empty",
    "backfilling",
    "waiting",
  ]);
});

it("does not call a forum empty before any of its posts are known", () => {
  expect(forum([])).toBe("waiting");
});

it("follows the posts of a forum", () => {
  expect(
    [
      [EMPTY, EMPTY],
      [STORED, EMPTY],
      [UNTOUCHED, UNTOUCHED],
      [STORED, UNTOUCHED],
    ].map((posts) => forum(posts)),
  ).toStrictEqual(["empty", "done", "waiting", "backfilling"]);
});
