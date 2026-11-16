import type { McpServer } from "@modelcontextprotocol/server";
import { Schema } from "effect";

import {
  FindMessagesInput,
  FindSimilarMessagesInput,
  ListChannelsInput,
  ReadMessagesInput,
} from "#/features/mcp/api/tool-input";
import {
  FindMessagesOutput,
  FindSimilarMessagesOutput,
  ListChannelsOutput,
  ListServerPhrasesOutput,
  ListServersOutput,
  ReadMessagesOutput,
} from "#/features/mcp/api/tool-output";
import { SERVICE_NAME } from "#/shared/config";

import { find, findLike, readTool } from "./message-tools.server";
import { PHRASES_DESCRIPTION } from "./phrases.server";
import { serverWithRelationTools } from "./relation-tools.server";
import { listChannels, listServers, phrases, PHRASES_TOOL_NAME } from "./server-tools.server";
import { TOOL_BASE } from "./tool-base";

const LIST_SERVERS_TOOL = {
  title: "List servers",
  description: `List the Discord servers you can read through ${SERVICE_NAME}.`,
  ...TOOL_BASE,
  outputSchema: ListServersOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

const LIST_CHANNELS_TOOL = {
  title: "List channels",
  description: "List the channels and threads you can read in a server.",
  ...TOOL_BASE,
  outputSchema: ListChannelsOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: ListChannelsInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

const LIST_SERVER_PHRASES_TOOL = {
  title: "List server phrases",
  description: PHRASES_DESCRIPTION,
  ...TOOL_BASE,
  outputSchema: ListServerPhrasesOutput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
  inputSchema: ListChannelsInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

const FIND_MESSAGES_TOOL = {
  title: "Find messages",
  description: "Find messages that contain exact words.",
  ...TOOL_BASE,
  outputSchema: FindMessagesOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: FindMessagesInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

const FIND_SIMILAR_MESSAGES_TOOL = {
  title: "Find similar messages",
  description: "Find messages by meaning when find_messages misses other wordings.",
  ...TOOL_BASE,
  outputSchema: FindSimilarMessagesOutput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
  inputSchema: FindSimilarMessagesInput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
};

const READ_MESSAGES_TOOL = {
  title: "Read messages",
  description: "Read the latest messages of a channel or of one person, newest first.",
  ...TOOL_BASE,
  outputSchema: ReadMessagesOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: ReadMessagesInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

export const buildServer = (discordUserId: string): McpServer => {
  const server = serverWithRelationTools(discordUserId);
  server.registerTool("list_servers", LIST_SERVERS_TOOL, () => listServers(discordUserId));
  server.registerTool("list_channels", LIST_CHANNELS_TOOL, listChannels(discordUserId));
  server.registerTool(PHRASES_TOOL_NAME, LIST_SERVER_PHRASES_TOOL, phrases(discordUserId));
  server.registerTool("find_messages", FIND_MESSAGES_TOOL, find(discordUserId));
  server.registerTool("find_similar_messages", FIND_SIMILAR_MESSAGES_TOOL, findLike(discordUserId));
  server.registerTool("read_messages", READ_MESSAGES_TOOL, readTool(discordUserId));
  return server;
};
