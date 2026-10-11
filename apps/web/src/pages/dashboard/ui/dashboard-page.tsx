import { useSuspenseQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { dashboardQuery } from "#/pages/dashboard/api/dashboard";
import { landingOf } from "#/pages/dashboard/model/sign-in-landing";
import { SIGN_IN_LANDING } from "#/shared/config";
import { AppFrame } from "#/shared/ui/app-frame";

import { DashboardView } from "./dashboard-view";
import { LandingRedirect } from "./landing-redirect";
import { SignInPanel } from "./sign-in-panel";

const DashboardPage = (): ReactNode => {
  const { data } = useSuspenseQuery(dashboardQuery);
  const search = useSearch({ from: "/dashboard/" });
  const landing = landingOf({ dashboard: data, search });
  return (
    <AppFrame>
      <LandingRedirect landing={landing} />
      {data.status === "signedOut" && <SignInPanel returnTo={SIGN_IN_LANDING} />}
      {data.status === "ready" && <DashboardView dashboard={data} />}
    </AppFrame>
  );
};

export { DashboardPage };
