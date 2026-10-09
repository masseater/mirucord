import { createFileRoute } from "@tanstack/react-router";

import { ConsentPage, validateConsentSearch } from "#/pages/consent";

const Route = createFileRoute("/consent")({
  validateSearch: validateConsentSearch,
  component: ConsentPage,
});

export { Route };
