import { createFileRoute } from "@tanstack/react-router";

import { TechPage } from "#/pages/guide";

const Route = createFileRoute("/tech")({
  head: () => ({ meta: [{ title: "技術の話 | mirucord" }] }),
  component: TechPage,
});

export { Route };
