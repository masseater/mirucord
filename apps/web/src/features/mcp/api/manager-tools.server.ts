import type { McpServer } from "@modelcontextprotocol/server";

import { listAuditLog } from "./audit-log.server";
import { listMemberInvites } from "./member-invites.server";
import { LIST_AUDIT_LOG_TOOL, LIST_MEMBER_INVITES_TOOL } from "./relation-tool-defs";
import { newServer } from "./tool-base";

const serverWithManagerTools = (discordUserId: string): McpServer => {
  const server = newServer();
  server.registerTool("list_audit_log", LIST_AUDIT_LOG_TOOL, listAuditLog(discordUserId));
  server.registerTool(
    "list_member_invites",
    LIST_MEMBER_INVITES_TOOL,
    listMemberInvites(discordUserId),
  );
  return server;
};

export { serverWithManagerTools };
