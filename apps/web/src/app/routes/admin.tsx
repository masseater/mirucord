import { createFileRoute } from "@tanstack/react-router";

import { AdminPage, loadAdminPage } from "#/pages/admin";

const Route = createFileRoute("/admin")({
  loader: ({ context }) => loadAdminPage(context.queryClient),
  component: AdminPage,
});

export { Route };
