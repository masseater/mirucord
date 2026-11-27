import { createFileRoute } from "@tanstack/react-router";

import { DashboardPage, dashboardQuery, validateDashboardSearch } from "#/pages/dashboard";
import { DASHBOARD_NAME, SERVICE_NAME } from "#/shared/config";

export const Route = createFileRoute("/dashboard/")({
  validateSearch: validateDashboardSearch,
  loader: ({ context }) => context.queryClient.query(dashboardQuery),
  head: () => ({ meta: [{ title: `${DASHBOARD_NAME} | ${SERVICE_NAME}` }] }),
  component: DashboardPage,
});
