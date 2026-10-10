import type { FetchStatus } from "@tanstack/react-query";

import type { RefreshOutcome } from "#/pages/dashboard/api/dashboard";

type RefreshState = Readonly<{ fetchStatus: FetchStatus }> &
  (
    | Readonly<{ status: "pending" }>
    | Readonly<{ status: "error" }>
    | Readonly<{ status: "success"; data: RefreshOutcome }>
  );

const LABEL: Readonly<Record<FetchStatus, string>> = {
  idle: "更新",
  paused: "更新",
  fetching: "ミルが見てくるね",
};

const OUTCOME_NOTE: Readonly<Record<RefreshOutcome["status"], string>> = {
  refreshed: "見てきたよ！",
  coolingDown: "さっき見てきたところだよ",
  notManaged: "",
  signedOut: "",
};

const FAILED = "更新できませんでした";
const SILENT = "";

const refreshLabel = ({ fetchStatus }: RefreshState): string => LABEL[fetchStatus];

const refreshNote = (state: RefreshState): string => {
  if (state.fetchStatus === "fetching") {
    return SILENT;
  }
  if (state.status === "success") {
    return OUTCOME_NOTE[state.data.status];
  }
  if (state.status === "error") {
    return FAILED;
  }
  return SILENT;
};

export { refreshLabel, refreshNote };
export type { RefreshState };
