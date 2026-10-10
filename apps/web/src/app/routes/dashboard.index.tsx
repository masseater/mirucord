import { createFileRoute } from "@tanstack/react-router";

import { DashboardPage, dashboardQuery } from "#/pages/dashboard";

const Route = createFileRoute("/dashboard/")({
  loader: ({ context }) => context.queryClient.query(dashboardQuery),
  head: () => ({ meta: [{ title: "管理画面 | mirucord" }] }),
  component: DashboardPage,
});

export { Route };
