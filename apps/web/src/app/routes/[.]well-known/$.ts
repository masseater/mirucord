import { createFileRoute } from "@tanstack/react-router";

import { getAuth } from "#/shared/auth/index.server";

const handle = ({ request }: Readonly<{ request: Request }>): Promise<Response> =>
  getAuth().handler(request);

const Route = createFileRoute("/.well-known/$")({
  server: { handlers: { GET: handle } },
});

export { Route };
