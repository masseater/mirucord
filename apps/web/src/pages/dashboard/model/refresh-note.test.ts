import { expect, it } from "vite-plus/test";

import { refreshLabel, refreshNote } from "./refresh-note";

it("tells the viewer that Mil is looking while the refresh runs", () => {
  const state = { fetchStatus: "fetching", status: "pending" } as const;
  expect(refreshLabel(state)).toBe("ミルが見てくるね");
  expect(refreshNote(state)).toBe("");
});

it("reports a finished refresh and a refresh refused by the cooldown", () => {
  expect(
    refreshNote({ fetchStatus: "idle", status: "success", data: { status: "refreshed" } }),
  ).toBe("見てきたよ！");
  expect(
    refreshNote({ fetchStatus: "idle", status: "success", data: { status: "coolingDown" } }),
  ).toBe("さっき見てきたところだよ");
});

it("says nothing for an access outcome the page already shows", () => {
  expect(
    refreshNote({ fetchStatus: "idle", status: "success", data: { status: "notManaged" } }),
  ).toBe("");
  expect(refreshNote({ fetchStatus: "paused", status: "pending" })).toBe("");
});

it("reports a failed refresh once it stops", () => {
  const state = { fetchStatus: "idle", status: "error" } as const;
  expect(refreshLabel(state)).toBe("更新");
  expect(refreshNote(state)).toBe("更新できませんでした");
});
