import type { ReactNode } from "react";

import { tipFor } from "#/pages/dashboard/model/dashboard-tip";
import { nextStepsOf } from "#/pages/dashboard/model/next-steps";
import type { NextSteps, ReadyDashboard } from "#/pages/dashboard/model/next-steps";
import { MascotTip } from "#/shared/ui/mascot-tip";

import { AccountPanels } from "./account-panels.tsx";
import { GuildList } from "./guild-list.tsx";
import { McpUrlPanel } from "./mcp-url-panel.tsx";
import { NextStepsPanel } from "./next-steps/next-steps-panel.tsx";
import { ReadableGuildPanel } from "./readable-guild-panel.tsx";

const TITLE = "管理画面";
const URL_TITLE = "ほかのアプリに登録する URL";

const stepsOrUrl = (steps: NextSteps, inviteUrl: string): ReactNode => {
  if (steps.status === "pending") {
    return (
      <NextStepsPanel consent={steps.consent} register={steps.register} inviteUrl={inviteUrl} />
    );
  }
  return <McpUrlPanel title={URL_TITLE} />;
};

export const DashboardView = ({
  dashboard,
}: Readonly<{ dashboard: ReadyDashboard }>): ReactNode => {
  const steps = nextStepsOf(dashboard);
  return (
    <>
      <MascotTip>{tipFor(dashboard)}</MascotTip>
      <h1 className="text-dc-bright font-maru text-3xl font-black">{TITLE}</h1>
      {stepsOrUrl(steps, dashboard.inviteUrl)}
      <ReadableGuildPanel listing={dashboard.readable} />
      <AccountPanels apps={dashboard.apps} name={dashboard.name} />
      <hr className="border-dc-line border-t border-dashed" />
      <GuildList guilds={dashboard.guilds} inviteUrl={dashboard.inviteUrl} />
    </>
  );
};
