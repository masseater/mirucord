import { Option } from "effect";
import { expect, it } from "vite-plus/test";

import type { ReadyDashboard } from "./next-steps";
import { nextStepsOf } from "./next-steps";

const BASE: ReadyDashboard = {
  status: "ready",
  name: "kenta",
  guilds: [],
  inviteUrl: "https://discord.com/oauth2/authorize",
  readable: { status: "ready", guilds: [] },
  apps: [],
};

const NO_ICON: string | null = Option.getOrNull(Option.none<string>());
const NEVER: number | null = Option.getOrNull(Option.none<number>());
const AWAITING = { id: "700", name: "game", icon: NO_ICON, ingest: "awaiting" } as const;
const APP = { clientId: "claude", name: "Claude", connectedAt: NEVER, updatedAt: NEVER };
const READABLE = { id: "700", name: "game", icon: NO_ICON };

it("asks someone with nothing set up to invite the bot and register the app", () => {
  expect(nextStepsOf(BASE)).toStrictEqual({
    status: "pending",
    consent: { status: "invite" },
    register: { status: "todo" },
  });
});

it("points a manager at the servers still waiting for consent", () => {
  expect(nextStepsOf({ ...BASE, guilds: [AWAITING], apps: [APP] })).toStrictEqual({
    status: "pending",
    consent: { status: "awaiting", guilds: [AWAITING] },
    register: { status: "done" },
  });
});

it("treats a member of a consented server as past the first step", () => {
  expect(
    nextStepsOf({
      ...BASE,
      readable: { status: "ready", guilds: [READABLE] },
    }),
  ).toStrictEqual({
    status: "pending",
    consent: { status: "done" },
    register: { status: "todo" },
  });
});

it("hides the steps once a consented server is searchable from a registered app", () => {
  expect(
    nextStepsOf({
      ...BASE,
      readable: { status: "ready", guilds: [READABLE] },
      apps: [APP],
    }),
  ).toStrictEqual({ status: "finished" });
});
