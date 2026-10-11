import { Option } from "effect";
import { expect, it } from "vite-plus/test";

import type { ForumPostsOutcome } from "#/pages/dashboard/api/dashboard";

import { forumPostsNote, forumPostsViewOf } from "./forum-posts-view";

const NO_RESULT = Option.getOrUndefined(Option.none<ForumPostsOutcome>());

const POST = { id: "603", name: "質問", ingest: "done", messages: 2 } as const;

it("waits while the posts are on their way and says when they could not be read", () => {
  expect(forumPostsViewOf({ status: "pending", data: NO_RESULT })).toStrictEqual({
    status: "loading",
  });
  expect(forumPostsNote({ status: "failed" })).toBe("読み込めませんでした");
  expect(forumPostsViewOf({ status: "error", data: NO_RESULT })).toStrictEqual({
    status: "failed",
  });
});

it("lists the posts and tells apart an empty forum from one the viewer cannot see", () => {
  expect(
    forumPostsViewOf({ status: "success", data: { status: "ready", posts: [POST] } }),
  ).toStrictEqual({ status: "listed", posts: [POST] });
  expect(
    forumPostsViewOf({ status: "success", data: { status: "ready", posts: [] } }),
  ).toStrictEqual({ status: "empty" });
  expect(forumPostsViewOf({ status: "success", data: { status: "forbidden" } })).toStrictEqual({
    status: "unavailable",
  });
  expect(forumPostsViewOf({ status: "success", data: { status: "signedOut" } })).toStrictEqual({
    status: "unavailable",
  });
});
