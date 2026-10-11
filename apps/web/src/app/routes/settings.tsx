import { createFileRoute } from "@tanstack/react-router";

import { SettingsPage, settingsQuery } from "#/pages/settings";

const Route = createFileRoute("/settings")({
  loader: ({ context }) => context.queryClient.query(settingsQuery),
  head: () => ({ meta: [{ title: "設定 | mirucord" }] }),
  component: SettingsPage,
});

export { Route };
