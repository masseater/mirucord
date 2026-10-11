import { createFileRoute } from "@tanstack/react-router";

import { TechPage } from "#/pages/guide";
import { SERVICE_NAME } from "#/shared/config";

const Route = createFileRoute("/tech")({
  head: () => ({ meta: [{ title: `技術の話 | ${SERVICE_NAME}` }] }),
  component: TechPage,
});

export { Route };
