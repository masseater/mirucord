import { useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { dashboardQuery } from "#/pages/dashboard/api/dashboard";
import { DASHBOARD_PATH } from "#/shared/config";
import { AppFrame } from "#/shared/ui/app-frame";

import { DashboardView } from "./dashboard-view";
import { SignInPanel } from "./sign-in-panel";

const DashboardPage = (): ReactNode => {
  const { data } = useSuspenseQuery(dashboardQuery);
  return (
    <AppFrame>
      {data.status === "signedOut" && <SignInPanel returnTo={DASHBOARD_PATH} />}
      {data.status === "ready" && <DashboardView dashboard={data} />}
    </AppFrame>
  );
};

export { DashboardPage };
