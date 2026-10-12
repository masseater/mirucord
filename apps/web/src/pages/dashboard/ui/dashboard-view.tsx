import type { ReactNode } from "react";

import type { GuildIngest } from "#/features/ingest/index.server";
import { nextStepsOf } from "#/pages/dashboard/model/next-steps";
import type { NextSteps, ReadyDashboard } from "#/pages/dashboard/model/next-steps";
import { MascotTip } from "#/shared/ui/mascot-tip";

import { AccountPanel } from "./account-panel";
import { ConnectedAppPanel } from "./connected-app-panel";
import { GuildList } from "./guild-list";
import { McpUrlPanel } from "./mcp-url-panel";
import { NextStepsPanel } from "./next-steps/next-steps-panel";
import { ReadableGuildPanel } from "./readable-guild-panel";

const TITLE = "管理画面";
const WITHDRAWING_TIP = "削除中だよ！";
const INGESTING_TIP = "思い出を集めてるよ";
const URL_TITLE = "ほかのアプリに登録する URL";
const INGESTING: ReadonlySet<GuildIngest> = new Set(["waiting", "backfilling"]);

const tipFor = ({ name, guilds }: ReadyDashboard): string => {
  if (guilds.some(({ ingest }) => ingest === "withdrawing")) {
    return WITHDRAWING_TIP;
  }
  if (guilds.some(({ ingest }) => INGESTING.has(ingest))) {
    return INGESTING_TIP;
  }
  return `${name}さん、おかえり！`;
};

const stepsOrUrl = (steps: NextSteps, inviteUrl: string): ReactNode => {
  if (steps.status === "pending") {
    return (
      <NextStepsPanel consent={steps.consent} register={steps.register} inviteUrl={inviteUrl} />
    );
  }
  return <McpUrlPanel title={URL_TITLE} />;
};

const DashboardView = ({ dashboard }: Readonly<{ dashboard: ReadyDashboard }>): ReactNode => {
  const steps = nextStepsOf(dashboard);
  return (
    <>
      <MascotTip>{tipFor(dashboard)}</MascotTip>
      <h1 className="text-dc-bright font-maru text-3xl font-black">{TITLE}</h1>
      {stepsOrUrl(steps, dashboard.inviteUrl)}
      <ReadableGuildPanel listing={dashboard.readable} />
      <ConnectedAppPanel apps={dashboard.apps} />
      <AccountPanel name={dashboard.name} />
      <hr className="border-dc-line border-t border-dashed" />
      <GuildList guilds={dashboard.guilds} inviteUrl={dashboard.inviteUrl} />
    </>
  );
};

export { DashboardView };
