import type { McpServer } from "@modelcontextprotocol/server";

import { listAuditLog } from "./audit-log.server";
import { listMembers } from "./members.server";
import { listReactions } from "./reactions.server";
import {
  LIST_AUDIT_LOG_TOOL,
  LIST_MEMBERS_TOOL,
  LIST_REACTIONS_TOOL,
  LIST_SCHEDULED_EVENTS_TOOL,
  LIST_THREAD_MEMBERS_TOOL,
  LIST_VOICE_SESSIONS_TOOL,
} from "./relation-tool-defs";
import { listScheduledEvents } from "./scheduled-events.server";
import { listThreadMembers } from "./thread-members.server";
import { newServer } from "./tool-base";
import { listVoiceSessions } from "./voice.server";

const serverWithRelationTools = (discordUserId: string): McpServer => {
  const server = newServer();
  server.registerTool("list_members", LIST_MEMBERS_TOOL, listMembers(discordUserId));
  server.registerTool(
    "list_voice_sessions",
    LIST_VOICE_SESSIONS_TOOL,
    listVoiceSessions(discordUserId),
  );
  server.registerTool("list_reactions", LIST_REACTIONS_TOOL, listReactions(discordUserId));
  server.registerTool(
    "list_scheduled_events",
    LIST_SCHEDULED_EVENTS_TOOL,
    listScheduledEvents(discordUserId),
  );
  server.registerTool(
    "list_thread_members",
    LIST_THREAD_MEMBERS_TOOL,
    listThreadMembers(discordUserId),
  );
  server.registerTool("list_audit_log", LIST_AUDIT_LOG_TOOL, listAuditLog(discordUserId));
  return server;
};

export { serverWithRelationTools };
