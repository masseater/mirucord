import type { ReactNode } from "react";

import type { GuildIngest } from "#/features/ingest/index.server";
import type { Dashboard } from "#/pages/dashboard/api/dashboard.server";
import { MascotTip } from "#/shared/ui/mascot-tip";

import { AccountPanel } from "./account-panel";
import { ConnectedAppPanel } from "./connected-app-panel";
import { GuildList } from "./guild-list";
import { McpUrlPanel } from "./mcp-url-panel";
import { ReadableGuildPanel } from "./readable-guild-panel";

const TITLE = "管理画面";
const WITHDRAWING_TIP = "削除中だよ！";
const INGESTING_TIP = "思い出を集めてるよ";
const INGESTING: ReadonlySet<GuildIngest> = new Set(["waiting", "backfilling"]);

type ReadyDashboard = Extract<Dashboard, Readonly<{ status: "ready" }>>;

const tipFor = ({ name, guilds }: ReadyDashboard): string => {
  if (guilds.some(({ ingest }) => ingest === "withdrawing")) {
    return WITHDRAWING_TIP;
  }
  if (guilds.some(({ ingest }) => INGESTING.has(ingest))) {
    return INGESTING_TIP;
  }
  return `${name}さん、おかえり！`;
};

const DashboardView = ({ dashboard }: Readonly<{ dashboard: ReadyDashboard }>): ReactNode => (
  <>
    <MascotTip>{tipFor(dashboard)}</MascotTip>
    <h1 className="text-dc-bright font-maru text-3xl font-black">{TITLE}</h1>
    <McpUrlPanel />
    <ReadableGuildPanel listing={dashboard.readable} />
    <ConnectedAppPanel apps={dashboard.apps} />
    <AccountPanel name={dashboard.name} />
    <hr className="border-dc-line border-t border-dashed" />
    <GuildList guilds={dashboard.guilds} inviteUrl={dashboard.inviteUrl} />
  </>
);

export { DashboardView };
