import { createFileRoute } from "@tanstack/react-router";

import { SelfHostPage } from "#/pages/guide";

const Route = createFileRoute("/self-host")({
  head: () => ({ meta: [{ title: "セルフホスト | mirucord" }] }),
  component: SelfHostPage,
});

export { Route };
