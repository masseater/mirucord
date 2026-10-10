import { Boolean, Function, Option } from "effect";

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
  backfill: "pending" | "done";
  botAccess: "readable" | "hidden";
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

const ingestOf: {
  (row: IngestRow): (scope: ConsentScope) => ChannelIngest;
  (scope: ConsentScope, row: IngestRow): ChannelIngest;
} = Function.dual(DATA_FIRST_ARITY, ingestOfDataFirst);

export { ingestOf };
export type { ChannelIngest, IngestRow };
