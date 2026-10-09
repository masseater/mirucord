import { createFileRoute } from "@tanstack/react-router";

import { serveMcp } from "#/features/mcp/index.server";

const handle = ({ request }: Readonly<{ request: Request }>): Promise<Response> =>
  serveMcp(request);

const Route = createFileRoute("/mcp")({
  server: { handlers: { GET: handle, POST: handle, DELETE: handle } },
});

export { Route };
