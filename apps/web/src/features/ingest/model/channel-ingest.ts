import { Boolean, Function, Option } from "effect";

import { isInScope } from "./consent-scope";
import type { ConsentScope, ScopedChannel } from "./consent-scope";

const DATA_FIRST_ARITY = 2;
const BACKFILL_INGEST = { pending: "backfilling", done: "done" } as const;
const HIDDEN_INGEST = { inScope: "paused", outOfScope: "unreadable" } as const;

type ChannelIngest = "unreadable" | "excluded" | "paused" | "waiting" | "backfilling" | "done";

type IngestRow = ScopedChannel &
  Readonly<{
    newest: string | null;
    backfill: "pending" | "done";
    botAccess: "readable" | "hidden";
  }>;

const ingestOfDataFirst = (scope: ConsentScope, row: IngestRow): ChannelIngest => {
  const placement = Boolean.match(isInScope(scope, row), {
    onTrue: () => "inScope" as const,
    onFalse: () => "outOfScope" as const,
  });
  if (row.botAccess === "hidden") {
    return HIDDEN_INGEST[placement];
  }
  if (placement === "outOfScope") {
    return "excluded";
  }
  if (Option.isNone(Option.fromNullOr(row.newest))) {
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
