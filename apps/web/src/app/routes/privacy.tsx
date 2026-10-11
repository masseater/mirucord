import { createFileRoute } from "@tanstack/react-router";

import { PrivacyPage } from "#/pages/legal";
import { SERVICE_NAME } from "#/shared/config";

const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: `プライバシーポリシー | ${SERVICE_NAME}` }] }),
  component: PrivacyPage,
});

export { Route };
