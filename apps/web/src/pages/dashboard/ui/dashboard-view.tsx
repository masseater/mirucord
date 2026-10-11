import type { ReactNode } from "react";

import type { Dashboard } from "#/pages/dashboard/api/dashboard.server";
import { MascotTip } from "#/shared/ui/mascot-tip";

import { AccountPanel } from "./account-panel";
import { ConnectedAppPanel } from "./connected-app-panel";
import { GuildList } from "./guild-list";
import { McpUrlPanel } from "./mcp-url-panel";
import { ReadableGuildPanel } from "./readable-guild-panel";

const TITLE = "管理画面";
const WITHDRAWING_TIP = "削除中だよ！";

type ReadyDashboard = Extract<Dashboard, Readonly<{ status: "ready" }>>;

const tipFor = ({ name, guilds }: ReadyDashboard): string => {
  if (guilds.some(({ consent }) => consent === "withdrawing")) {
    return WITHDRAWING_TIP;
  }
  return `${name}さん、おかえり！`;
};

const DashboardView = ({ dashboard }: Readonly<{ dashboard: ReadyDashboard }>): ReactNode => (
  <>
    <MascotTip>{tipFor(dashboard)}</MascotTip>
    <h1 className="text-3xl font-black">{TITLE}</h1>
    <McpUrlPanel />
    <ReadableGuildPanel listing={dashboard.readable} />
    <ConnectedAppPanel apps={dashboard.apps} />
    <AccountPanel name={dashboard.name} />
    <hr className="border-ink border-t-2 border-dashed" />
    <GuildList guilds={dashboard.guilds} inviteUrl={dashboard.inviteUrl} />
  </>
);

export { DashboardView };
