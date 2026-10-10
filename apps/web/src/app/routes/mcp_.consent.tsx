import { createFileRoute } from "@tanstack/react-router";

import { ConsentPage, validateConsentSearch } from "#/pages/mcp-consent";

const Route = createFileRoute("/mcp_/consent")({
  validateSearch: validateConsentSearch,
  component: ConsentPage,
});

export { Route };
