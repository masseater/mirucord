import { useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { dashboardQuery } from "#/pages/dashboard/api/dashboard";
import { AppFrame } from "#/shared/ui/app-frame";

import { GuildList } from "./guild-list";
import { SignInPanel } from "./sign-in-panel";

const RETURN_TO = "/dashboard";

const DashboardPage = (): ReactNode => {
  const { data } = useSuspenseQuery(dashboardQuery);
  return (
    <AppFrame>
      {data.status === "signedOut" && <SignInPanel returnTo={RETURN_TO} />}
      {data.status === "ready" && <GuildList guilds={data.guilds} inviteUrl={data.inviteUrl} />}
    </AppFrame>
  );
};

export { DashboardPage };
