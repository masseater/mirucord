import { Array, Boolean, Function, Option, pipe } from "effect";

import type { ChannelKind } from "#/shared/discord";

import type { BotAccess } from "./bot-access";
import type { ConsentScope } from "./consent-scope";

const DATA_FIRST_ARITY = 2;
const BACKFILL_INGEST = { pending: "backfilling", done: "done" } as const;
const EMPTY_INGEST = { pending: "waiting", done: "done" } as const;
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
    return EMPTY_INGEST[row.backfill];
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
    Array.isReadonlyArrayNonEmpty(posts) && posts.every(({ backfill }) => backfill === "done"),
    { onTrue: () => "done" as const, onFalse: () => "pending" as const },
  ),
  botAccess: forum.botAccess,
});

const forumRowOf: {
  (posts: readonly IngestRow[]): (forum: Pick<IngestRow, "botAccess">) => IngestRow;
  (forum: Pick<IngestRow, "botAccess">, posts: readonly IngestRow[]): IngestRow;
} = Function.dual(DATA_FIRST_ARITY, forumRowOfDataFirst);

const NOTICE_KINDS: ReadonlySet<ChannelKind> = new Set(["text", "announcement"]);

const isNoticeCandidate = ({
  kind,
  ingest,
  botPost,
}: Readonly<{
  kind: ChannelKind;
  ingest: ChannelIngest;
  botPost: "allowed" | "denied";
}>): boolean => NOTICE_KINDS.has(kind) && ingest !== "unreadable" && botPost === "allowed";

type GuildIngest = "awaiting" | "withdrawing" | "waiting" | "backfilling" | "done";

type GuildConsent = "awaiting" | "granted" | "withdrawing";

const IN_PROGRESS: ReadonlySet<ChannelIngest> = new Set(["waiting", "backfilling"]);
const COUNTED: ReadonlySet<ChannelIngest> = new Set(["waiting", "backfilling", "done"]);

const grantedIngest = (channels: readonly ChannelIngest[]): GuildIngest => {
  const counted = channels.filter((ingest) => COUNTED.has(ingest));
  if (!counted.some((ingest) => IN_PROGRESS.has(ingest))) {
    return "done";
  }
  if (counted.every((ingest) => ingest === "waiting")) {
    return "waiting";
  }
  return "backfilling";
};

const guildIngestOfDataFirst = (
  consent: GuildConsent,
  channels: readonly ChannelIngest[],
): GuildIngest => {
  if (consent === "granted") {
    return grantedIngest(channels);
  }
  return consent;
};

const guildIngestOf: {
  (channels: readonly ChannelIngest[]): (consent: GuildConsent) => GuildIngest;
  (consent: GuildConsent, channels: readonly ChannelIngest[]): GuildIngest;
} = Function.dual(DATA_FIRST_ARITY, guildIngestOfDataFirst);

const SCOPE_OF_CONSENT = {
  awaiting: { status: "awaiting" },
  granted: { status: "granted" },
  withdrawing: { status: "awaiting" },
} as const satisfies Record<GuildConsent, ConsentScope>;

const ingestOf: {
  (row: IngestRow): (scope: ConsentScope) => ChannelIngest;
  (scope: ConsentScope, row: IngestRow): ChannelIngest;
} = Function.dual(DATA_FIRST_ARITY, ingestOfDataFirst);

export { forumRowOf, guildIngestOf, ingestOf, isNoticeCandidate, SCOPE_OF_CONSENT };
export type { ChannelIngest, GuildConsent, GuildIngest, IngestRow };
