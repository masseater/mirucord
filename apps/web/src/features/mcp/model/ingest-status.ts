import { Array, Option, pipe } from "effect";

import type { Backfill } from "#/shared/db";

type Consent = "consented" | "notConsented";

const INGEST_STATUSES = ["notConsented", "waiting", "backfilling", "done", "empty"] as const;

type IngestStatus = (typeof INGEST_STATUSES)[number];

type ChannelProgress = Readonly<{
  newest: Option.Option<string>;
  backfill: Backfill;
}>;

const READY: ReadonlySet<IngestStatus> = new Set(["done", "empty"]);

const PROGRESS_STATUS = {
  pending: { stored: "backfilling", none: "waiting" },
  done: { stored: "done", none: "empty" },
} as const;

const progressStatus = ({ newest, backfill }: ChannelProgress): IngestStatus =>
  Option.match(newest, {
    onNone: () => PROGRESS_STATUS[backfill].none,
    onSome: () => PROGRESS_STATUS[backfill].stored,
  });

type ForumRule = Readonly<{
  status: IngestStatus;
  matches: (statuses: readonly IngestStatus[]) => boolean;
}>;

const FORUM_RULES: readonly ForumRule[] = [
  { status: "waiting", matches: (statuses) => !Array.isReadonlyArrayNonEmpty(statuses) },
  {
    status: "empty",
    matches: (statuses) =>
      pipe(
        statuses,
        Array.every((status) => status === "empty"),
      ),
  },
  {
    status: "done",
    matches: (statuses) =>
      pipe(
        statuses,
        Array.every((status) => READY.has(status)),
      ),
  },
  {
    status: "waiting",
    matches: (statuses) =>
      pipe(
        statuses,
        Array.every((status) => status === "waiting"),
      ),
  },
];

const postsStatus = (posts: readonly ChannelProgress[]): IngestStatus => {
  const statuses = pipe(
    posts,
    Array.map((post) => progressStatus(post)),
  );
  return Array.findFirst(FORUM_RULES, ({ matches }) => matches(statuses)).pipe(
    Option.map(({ status }) => status),
    Option.getOrElse((): IngestStatus => "backfilling"),
  );
};

type StatusRequest =
  | Readonly<{ consent: Consent; kind: "channel"; progress: ChannelProgress }>
  | Readonly<{ consent: Consent; kind: "forum"; posts: readonly ChannelProgress[] }>;

const ingestStatus = (request: StatusRequest): IngestStatus => {
  if (request.consent === "notConsented") {
    return "notConsented";
  }
  if (request.kind === "forum") {
    return postsStatus(request.posts);
  }
  return progressStatus(request.progress);
};

const isReady = (status: IngestStatus): boolean => READY.has(status);

export { INGEST_STATUSES, ingestStatus, isReady };
export type { ChannelProgress, Consent, IngestStatus, StatusRequest };
