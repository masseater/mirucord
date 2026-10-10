import type { UseQueryResult } from "@tanstack/react-query";
import { Option } from "effect";

import type { RefreshOutcome } from "#/pages/dashboard/api/dashboard";

type RefreshView =
  | Readonly<{ status: "waiting" }>
  | Readonly<{ status: "looking" }>
  | Readonly<{ status: "failed" }>
  | Readonly<{ status: "done"; outcome: RefreshOutcome }>;

const IDLE_LABEL = "更新";

const LABEL: Readonly<Record<RefreshView["status"], string>> = {
  waiting: IDLE_LABEL,
  looking: "ミルが見てくるね",
  failed: IDLE_LABEL,
  done: IDLE_LABEL,
};

const OUTCOME_NOTE: Readonly<Record<RefreshOutcome["status"], string>> = {
  refreshed: "見てきたよ！",
  coolingDown: "さっき見てきたところだよ",
  notManaged: "",
  signedOut: "",
};

const SILENT = "";

const refreshViewOf = ({
  fetchStatus,
  status,
  data,
}: Readonly<
  Pick<UseQueryResult<RefreshOutcome>, "data" | "fetchStatus" | "status">
>): RefreshView => {
  if (fetchStatus === "fetching") {
    return { status: "looking" };
  }
  if (status === "error") {
    return { status: "failed" };
  }
  return Option.match(Option.fromUndefinedOr(data), {
    onNone: (): RefreshView => ({ status: "waiting" }),
    onSome: (outcome): RefreshView => ({ status: "done", outcome }),
  });
};

const refreshLabel = (view: RefreshView): string => LABEL[view.status];

const refreshNote = (view: RefreshView): string => {
  if (view.status === "done") {
    return OUTCOME_NOTE[view.outcome.status];
  }
  if (view.status === "failed") {
    return "更新できませんでした";
  }
  return SILENT;
};

export { refreshLabel, refreshNote, refreshViewOf };
export type { RefreshView };
