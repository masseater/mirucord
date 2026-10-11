import { createFileRoute } from "@tanstack/react-router";

import { SelfHostPage } from "#/pages/guide";
import { SERVICE_NAME } from "#/shared/config";

const Route = createFileRoute("/self-host")({
  head: () => ({ meta: [{ title: `セルフホスト | ${SERVICE_NAME}` }] }),
  component: SelfHostPage,
});

export { Route };
