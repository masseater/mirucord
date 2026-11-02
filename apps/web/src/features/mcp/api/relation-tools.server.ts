import type { McpServer } from "@modelcontextprotocol/server";
import { Schema } from "effect";

import {
  ListMembersInput,
  ListReactionsInput,
  ListVoiceSessionsInput,
} from "#/features/mcp/api/tool-input";
import {
  ListMembersOutput,
  ListReactionsOutput,
  ListVoiceSessionsOutput,
} from "#/features/mcp/api/tool-output";
import { SERVICE_NAME } from "#/shared/config";

import { listMembers } from "./members.server";
import { listReactions } from "./reactions.server";
import { newServer, TOOL_BASE } from "./tool-base";
import { listVoiceSessions } from "./voice.server";

const LIST_MEMBERS_TOOL = {
  title: "List members",
  description: `List a server's members as Discord shows them: user name, global display name, server nickname, roles, whether the account is a bot, when they joined and, for people who left, when ${SERVICE_NAME} saw them leave. Members come oldest join first. Pass \`userIds\` to look people up by ID (from a message's \`authorId\` or \`mentions\`); people who left are included then unless \`includeLeft\` is false. \`query\` matches any of the three names, ignoring letter case. \`total\` counts all matches; advance \`offset\` by \`limit\` to page. People who left before ${SERVICE_NAME} first stored the member list are not included. Members are only stored once the server's admin allows ${SERVICE_NAME} to store data, so \`notConsented\` returns none.`,
  ...TOOL_BASE,
  outputSchema: ListMembersOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: ListMembersInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

const LIST_VOICE_SESSIONS_TOOL = {
  title: "List voice sessions",
  description: `List who was in which voice or stage channel and when, newest join first, for the channels you can see. Each session is one person's stay in one channel; moving to another channel ends it and starts a new one. \`left\` is null while they are still there. \`precision\` is \`exact\` when ${SERVICE_NAME} saw the join or leave as it happened, and \`noLaterThan\` when it only learned of it after reconnecting to Discord, so the real time is at or before \`at\`. Pass \`userIds\` or \`channelIds\` to narrow, and \`since\`/\`until\` (ISO 8601) to keep sessions that overlap that span. Look up names with \`list_members\`. Two people's sessions in the same channel overlapping means they were in the call together. Sessions are only recorded after the server's admin allows ${SERVICE_NAME} to store data, so \`notConsented\` returns none, and nothing from before 2026-11 exists.`,
  ...TOOL_BASE,
  outputSchema: ListVoiceSessionsOutput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
  inputSchema: ListVoiceSessionsInput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
};

const LIST_REACTIONS_TOOL = {
  title: "List reactions",
  description: `List who reacted to or voted in a poll on which message, newest first, for the channels you can see. \`emoji\` is the Unicode emoji, or \`name:id\` for a custom one; \`burst\` marks a super reaction. \`messageAuthorId\` is who wrote the reacted message, when Discord said so. Pass \`userIds\` for who reacted or voted, \`authorIds\` for whose messages got reactions (it narrows reactions only), \`channelIds\`, and \`since\`/\`until\` (ISO 8601). \`reactionTotal\` and \`voteTotal\` count all matches; advance \`offset\` by \`limit\` to page both. Reactions are only recorded after the server's admin allows ${SERVICE_NAME} to store data, so \`notConsented\` returns none and nothing from before 2026-11 is stored. To see reactions and votes older than that, pass \`message\` (its \`channelId\` and \`messageId\`): \`live\` then holds what Discord shows on that message now, up to 100 people per emoji or answer and 20 emoji; it is null when no message is given or the message is gone. Look up names with \`list_members\`.`,
  ...TOOL_BASE,
  outputSchema: ListReactionsOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: ListReactionsInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

const serverWithRelationTools = (discordUserId: string): McpServer => {
  const server = newServer();
  server.registerTool("list_members", LIST_MEMBERS_TOOL, listMembers(discordUserId));
  server.registerTool(
    "list_voice_sessions",
    LIST_VOICE_SESSIONS_TOOL,
    listVoiceSessions(discordUserId),
  );
  server.registerTool("list_reactions", LIST_REACTIONS_TOOL, listReactions(discordUserId));
  return server;
};

export { serverWithRelationTools };
