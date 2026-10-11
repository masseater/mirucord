import { Array, Boolean, Function, Option, pipe } from "effect";

import type { BotAccess } from "./bot-access";
import type { ConsentScope } from "./consent-scope";

const DATA_FIRST_ARITY = 2;
const BACKFILL_INGEST = { pending: "backfilling", done: "done" } as const;
const HIDDEN_INGEST = {
  granted: { stored: "paused", empty: "cleared" },
  awaiting: { stored: "unreadable", empty: "unreadable" },
} as const;

type ChannelIngest =
  | "unreadable"
  | "awaiting"
  | "paused"
  | "cleared"
  | "waiting"
  | "backfilling"
  | "done";

type IngestRow = Readonly<{
  newest: string | null;
  backfill: keyof typeof BACKFILL_INGEST;
  botAccess: BotAccess["status"];
}>;

const ingestOfDataFirst = (scope: ConsentScope, row: IngestRow): ChannelIngest => {
  const holding = Boolean.match(Option.isSome(Option.fromNullOr(row.newest)), {
    onTrue: () => "stored" as const,
    onFalse: () => "empty" as const,
  });
  if (row.botAccess === "hidden") {
    return HIDDEN_INGEST[scope.status][holding];
  }
  if (scope.status === "awaiting") {
    return "awaiting";
  }
  if (holding === "empty") {
    return "waiting";
  }
  return BACKFILL_INGEST[row.backfill];
};

const newestOfPosts = (posts: readonly IngestRow[]): string | null =>
  pipe(
    posts,
    Array.map(({ newest }) => Option.fromNullOr(newest)),
    Array.getSomes,
    Array.head,
    Option.getOrNull,
  );

const forumRowOfDataFirst = (
  forum: Pick<IngestRow, "botAccess">,
  posts: readonly IngestRow[],
): IngestRow => ({
  newest: newestOfPosts(posts),
  backfill: Boolean.match(
    posts.every(({ backfill }) => backfill === "done"),
    { onTrue: () => "done" as const, onFalse: () => "pending" as const },
  ),
  botAccess: forum.botAccess,
});

const forumRowOf: {
  (posts: readonly IngestRow[]): (forum: Pick<IngestRow, "botAccess">) => IngestRow;
  (forum: Pick<IngestRow, "botAccess">, posts: readonly IngestRow[]): IngestRow;
} = Function.dual(DATA_FIRST_ARITY, forumRowOfDataFirst);

const NOTICE_KINDS: ReadonlySet<string> = new Set(["text", "announcement"]);

const isNoticeCandidate = ({
  kind,
  ingest,
}: Readonly<{ kind: string; ingest: ChannelIngest }>): boolean =>
  NOTICE_KINDS.has(kind) && ingest !== "unreadable";

const ingestOf: {
  (row: IngestRow): (scope: ConsentScope) => ChannelIngest;
  (scope: ConsentScope, row: IngestRow): ChannelIngest;
} = Function.dual(DATA_FIRST_ARITY, ingestOfDataFirst);

export { forumRowOf, ingestOf, isNoticeCandidate };
export type { ChannelIngest, IngestRow };
