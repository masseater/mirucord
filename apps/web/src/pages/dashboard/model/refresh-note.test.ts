import { Option } from "effect";
import { expect, it } from "vite-plus/test";

import type { RefreshOutcome } from "#/pages/dashboard/api/dashboard";

import { refreshLabel, refreshNote, refreshViewOf } from "./refresh-note";

const NO_RESULT = Option.getOrUndefined(Option.none<RefreshOutcome>());

it("tells the viewer that Mil is looking while the refresh runs", () => {
  const view = { status: "looking" } as const;
  expect(refreshLabel(view)).toBe("ミルが見てくるね");
  expect(refreshNote(view)).toBe("");
});

it("reports a finished refresh and a refresh refused by the cooldown", () => {
  expect(refreshNote({ status: "done", outcome: { status: "refreshed" } })).toBe("見てきたよ！");
  expect(refreshNote({ status: "done", outcome: { status: "coolingDown" } })).toBe(
    "さっき見てきたところだよ",
  );
});

it("says nothing for an access outcome the page already shows", () => {
  expect(refreshNote({ status: "done", outcome: { status: "notManaged" } })).toBe("");
  expect(refreshNote({ status: "waiting" })).toBe("");
});

it("reports a failed refresh once it stops", () => {
  const view = { status: "failed" } as const;
  expect(refreshLabel(view)).toBe("更新");
  expect(refreshNote(view)).toBe("更新できませんでした");
});

it("keeps a refetch that is running ahead of an earlier result or failure", () => {
  const refreshed = { status: "refreshed" } as const;
  expect(
    refreshViewOf({ fetchStatus: "fetching", status: "success", data: refreshed }),
  ).toStrictEqual({ status: "looking" });
  expect(refreshViewOf({ fetchStatus: "idle", status: "error", data: refreshed })).toStrictEqual({
    status: "failed",
  });
  expect(refreshViewOf({ fetchStatus: "idle", status: "success", data: refreshed })).toStrictEqual({
    status: "done",
    outcome: refreshed,
  });
  expect(refreshViewOf({ fetchStatus: "idle", status: "pending", data: NO_RESULT })).toStrictEqual({
    status: "waiting",
  });
});
