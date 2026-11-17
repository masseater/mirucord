import type { McpServer } from "@modelcontextprotocol/server";

import { serverWith } from "#/shared/mcp";
import { toolCaller } from "#/shared/mcp/index.test.support";
import type { CallTool } from "#/shared/mcp/index.test.support";

import { USER } from "./scenario.test.support";

export const userToolCaller = (
  registrations: readonly ((discordUserId: string) => (server: McpServer) => void)[],
): CallTool => toolCaller(() => serverWith(registrations)(USER));
