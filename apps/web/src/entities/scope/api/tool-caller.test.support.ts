import { serverWith } from "#/shared/mcp";
import type { ToolRegistration } from "#/shared/mcp";
import { toolCaller } from "#/shared/mcp/index.test.support";
import type { CallTool } from "#/shared/mcp/index.test.support";

import { USER } from "./scenario.test.support";

export const userToolCaller = (registrations: readonly ToolRegistration[]): CallTool =>
  toolCaller(() => serverWith(registrations)(USER));
