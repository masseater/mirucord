import { useSuspenseQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { SignInPanel } from "#/features/sign-in";
import { dashboardQuery } from "#/pages/dashboard/api/dashboard";
import { landingOf } from "#/pages/dashboard/model/sign-in-landing";
import { DASHBOARD_NAME, SIGN_IN_LANDING } from "#/shared/config";
import { AppFrame } from "#/shared/ui/app-frame";

import { DashboardView } from "./dashboard-view.tsx";
import { LandingRedirect } from "./landing-redirect.tsx";

export const DashboardPage = (): ReactNode => {
  const { data } = useSuspenseQuery(dashboardQuery);
  const search = useSearch({ from: "/dashboard/" });
  const landing = landingOf({ dashboard: data, search });
  return (
    <AppFrame>
      <LandingRedirect landing={landing} />
      {data.status === "signedOut" && (
        <SignInPanel title={DASHBOARD_NAME} returnTo={SIGN_IN_LANDING} />
      )}
      {data.status === "ready" && <DashboardView dashboard={data} />}
    </AppFrame>
  );
};
