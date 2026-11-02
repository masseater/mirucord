import type { McpServer } from "@modelcontextprotocol/server";

import { listLinkedAccounts } from "./linked-accounts.server";
import { listMembers } from "./members.server";
import { listReactions } from "./reactions.server";
import {
  LIST_LINKED_ACCOUNTS_TOOL,
  LIST_MEMBERS_TOOL,
  LIST_REACTIONS_TOOL,
  LIST_VOICE_SESSIONS_TOOL,
} from "./relation-tool-defs";
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
    "list_linked_accounts",
    LIST_LINKED_ACCOUNTS_TOOL,
    listLinkedAccounts(discordUserId),
  );
  return server;
};

export { serverWithRelationTools };
