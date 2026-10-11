import { createFileRoute } from "@tanstack/react-router";

import { TermsPage } from "#/pages/legal";
import { SERVICE_NAME } from "#/shared/config";

const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: `利用規約 | ${SERVICE_NAME}` }] }),
  component: TermsPage,
});

export { Route };
