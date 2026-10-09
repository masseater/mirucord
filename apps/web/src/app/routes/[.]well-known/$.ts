import { createFileRoute } from "@tanstack/react-router";

import { auth } from "#/shared/auth/index.server";

const handle = ({ request }: Readonly<{ request: Request }>): Promise<Response> =>
  auth.handler(request);

const Route = createFileRoute("/.well-known/$")({
  server: { handlers: { GET: handle } },
});

export { Route };
