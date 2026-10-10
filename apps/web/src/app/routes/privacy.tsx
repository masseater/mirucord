import { createFileRoute } from "@tanstack/react-router";

import { PrivacyPage } from "#/pages/legal";

const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "プライバシーポリシー | mirucord" }] }),
  component: PrivacyPage,
});

export { Route };
