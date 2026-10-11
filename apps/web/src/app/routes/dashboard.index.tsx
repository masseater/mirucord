import { createFileRoute } from "@tanstack/react-router";

import { DashboardPage, dashboardQuery } from "#/pages/dashboard";
import { SERVICE_NAME } from "#/shared/config";

const Route = createFileRoute("/dashboard/")({
  loader: ({ context }) => context.queryClient.query(dashboardQuery),
  head: () => ({ meta: [{ title: `管理画面 | ${SERVICE_NAME}` }] }),
  component: DashboardPage,
});

export { Route };
