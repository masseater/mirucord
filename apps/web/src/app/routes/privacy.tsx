import { createFileRoute } from "@tanstack/react-router";

import { PrivacyPage } from "#/pages/privacy";

const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "プライバシーポリシー | mirucord" }] }),
  component: PrivacyPage,
});

export { Route };
