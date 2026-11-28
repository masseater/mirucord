import {
  registerListLinkedAccounts,
  registerListMembers,
} from "#/features/list-members/index.server";
import { registerListReactions } from "#/features/list-reactions/index.server";
import { registerListVoiceSessions } from "#/features/list-voice-sessions/index.server";

export const RELATION_TOOLS = [
  registerListMembers,
  registerListVoiceSessions,
  registerListReactions,
  registerListLinkedAccounts,
];
