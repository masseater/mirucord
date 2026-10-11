import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { Landing } from "#/pages/dashboard/model/sign-in-landing";

const LandingRedirect = ({ landing }: Readonly<{ landing: Landing }>): ReactNode => {
  if (landing.status === "consent") {
    return <Navigate to="/dashboard/$guildId" params={landing} replace />;
  }
  if (landing.status === "tidy") {
    return <Navigate to="/dashboard" replace />;
  }
  return false;
};

export { LandingRedirect };
