import { createFileRoute } from "@tanstack/react-router";

import { TermsPage } from "#/pages/legal";

const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "利用規約 | mirucord" }] }),
  component: TermsPage,
});

export { Route };
