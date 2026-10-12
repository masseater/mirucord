import type { UseQueryResult } from "@tanstack/react-query";
import { Array, Option } from "effect";

import type { ForumPost } from "#/features/ingest/index.server";
import type { ForumPostsOutcome } from "#/pages/dashboard/api/dashboard";

type ForumPostsView =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "failed" }>
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "empty" }>
  | Readonly<{ status: "listed"; posts: readonly ForumPost[] }>;

const NOTE: Readonly<Record<Exclude<ForumPostsView["status"], "listed">, string>> = {
  loading: "読み込み中",
  failed: "読み込めませんでした",
  unavailable: "",
  empty: "",
};

const viewOfOutcome = (outcome: ForumPostsOutcome): ForumPostsView => {
  if (outcome.status !== "ready") {
    return { status: "unavailable" };
  }
  if (!Array.isReadonlyArrayNonEmpty(outcome.posts)) {
    return { status: "empty" };
  }
  return { status: "listed", posts: outcome.posts };
};

const forumPostsViewOf = ({
  status,
  data,
}: Readonly<Pick<UseQueryResult<ForumPostsOutcome>, "data" | "status">>): ForumPostsView => {
  if (status === "error") {
    return { status: "failed" };
  }
  return Option.match(Option.fromUndefinedOr(data), {
    onNone: (): ForumPostsView => ({ status: "loading" }),
    onSome: viewOfOutcome,
  });
};

const forumPostsNote = (view: Exclude<ForumPostsView, Readonly<{ status: "listed" }>>): string =>
  NOTE[view.status];

export { forumPostsNote, forumPostsViewOf };
export type { ForumPostsView };
