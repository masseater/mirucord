import { expect, it } from "vite-plus/test";

import type { Dashboard } from "#/pages/dashboard/api/dashboard.server";

import { landingOf } from "./sign-in-landing";

const ready = (ingest: "awaiting" | "done"): Dashboard => ({
  status: "ready",
  name: "kenta",
  guilds: [{ id: "700", name: "game", icon: "icon", ingest }],
  inviteUrl: "https://discord.com/oauth2/authorize",
  readable: { status: "ready", guilds: [] },
  apps: [],
});

it("sends someone who just signed in to the server waiting for their consent", () => {
  expect(landingOf({ dashboard: ready("awaiting"), search: { from: "signIn" } })).toStrictEqual({
    status: "consent",
    guildId: "700",
  });
});

it("keeps a fresh sign-in on the dashboard when nothing waits for consent", () => {
  expect(landingOf({ dashboard: ready("done"), search: { from: "signIn" } })).toStrictEqual({
    status: "tidy",
  });
});

it("never moves someone who opened the dashboard on their own", () => {
  expect(landingOf({ dashboard: ready("awaiting"), search: {} })).toStrictEqual({
    status: "stay",
  });
});
