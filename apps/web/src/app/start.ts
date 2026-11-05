import { requestSpan, serverFnSpan } from "@r_masseater/workers-tracing/tanstack-start";
import { createStart } from "@tanstack/react-start";

const startInstance = createStart(() => ({
  requestMiddleware: [requestSpan],
  functionMiddleware: [serverFnSpan],
}));

export { startInstance };
