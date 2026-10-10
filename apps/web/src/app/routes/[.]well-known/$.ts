import { createFileRoute } from "@tanstack/react-router";

import { makeAuth } from "#/shared/auth/index.server";

const handle = ({ request }: Readonly<{ request: Request }>): Promise<Response> =>
  makeAuth().handler(request);

const Route = createFileRoute("/.well-known/$")({
  server: { handlers: { GET: handle } },
});

export { Route };
