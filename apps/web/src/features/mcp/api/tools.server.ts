import { McpServer } from "@modelcontextprotocol/server";
import type { CallToolResult } from "@modelcontextprotocol/server";
import { Effect, Option, Schema } from "effect";

import {
  FindMessagesInput,
  FindSimilarMessagesInput,
  FIRST_OFFSET,
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
import { SERVICE_NAME, SITE_ORIGIN } from "#/shared/config";

import { findMessages, readMessages } from "./messages.server";
import { PHRASES_DESCRIPTION, serverPhrases } from "./phrases.server";
import { readableGuilds } from "./scope.server";
import type { GuildScope } from "./scope.server";
import { findSimilar } from "./similar.server";
import {
  DISCORD_UNAVAILABLE,
  errorResult,
  ingestById,
  ingestOf,
  notFullyIngested,
  readableChannels,
  structuredResult,
  withChannel,
  withScope,
} from "./tool-scope.server";

const ICONS = [
  { src: `${SITE_ORIGIN}/apple-touch-icon.png`, mimeType: "image/png", sizes: ["180x180"] },
  { src: `${SITE_ORIGIN}/favicon-32x32.png`, mimeType: "image/png", sizes: ["32x32"] },
];
const SERVER_INFO = { name: SERVICE_NAME, version: "0.0.0", icons: ICONS, websiteUrl: SITE_ORIGIN };
const DEFAULT_LIMIT = 20;
const INGEST_GUIDE = `Each channel carries \`ingest\`: only \`empty\` means the channel has no messages in Discord. \`notConsented\`, \`waiting\` and \`backfilling\` mean ${SERVICE_NAME} has not stored all of its messages yet, so an empty or short result does not mean the channel is empty; say so instead of reporting that there are no messages.`;

const PHRASES_TOOL_NAME = "list_server_phrases";
const PHRASES_HINT = `Before reading messages, call \`${PHRASES_TOOL_NAME}\` once for this server: it lists the phrases, custom emoji and stickers its members keep repeating, so you can read them as the server's own in-jokes and greetings instead of working out each one.`;

const limitOf = (limit: number | undefined): number =>
  Option.getOrElse(Option.fromUndefinedOr(limit), () => DEFAULT_LIMIT);
const listServers = (discordUserId: string): Promise<CallToolResult> =>
  Effect.runPromise(
    readableGuilds(discordUserId).pipe(
      Effect.map((guilds) =>
        structuredResult({
          servers: guilds.map(({ guildId, name, consent }) => ({
            id: guildId,
            name,
            ingest: consent,
          })),
        } satisfies typeof ListServersOutput.Type),
      ),
      Effect.orElseSucceed(() => errorResult(DISCORD_UNAVAILABLE)),
    ),
  );

const visibleChannels = (scope: GuildScope): CallToolResult =>
  structuredResult({
    channels: readableChannels(scope).map((stored) => ({
      id: stored.id,
      name: stored.name,
      type: stored.type,
      parentId: Option.getOrNull(stored.parentId),
      ingest: ingestOf({ scope, stored }),
    })),
    hint: PHRASES_HINT,
  } satisfies typeof ListChannelsOutput.Type);

const listChannels =
  (discordUserId: string) =>
  ({ serverId }: typeof ListChannelsInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: serverId, discordUserId })((scope) =>
      Effect.succeed(visibleChannels(scope)),
    );

const phrases =
  (discordUserId: string) =>
  ({ serverId }: typeof ListChannelsInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: serverId, discordUserId })((scope) =>
      serverPhrases({ scope, channelIds: readableChannels(scope).map(({ id }) => id) }).pipe(
        Effect.map((found) =>
          structuredResult(found satisfies typeof ListServerPhrasesOutput.Type),
        ),
      ),
    );

const find =
  (discordUserId: string) =>
  ({
    serverId,
    query,
    channelId,
    limit,
    offset,
  }: typeof FindMessagesInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: serverId, discordUserId })((scope) =>
      withChannel({ scope, channelId: Option.fromUndefinedOr(channelId) })((channelIds) =>
        findMessages({
          scope,
          query,
          channelIds,
          limit: limitOf(limit),
          offset: Option.getOrElse(Option.fromUndefinedOr(offset), () => FIRST_OFFSET),
        }).pipe(
          Effect.map(({ total, messages }) =>
            structuredResult({
              total,
              messages,
              notFullyIngested: notFullyIngested({ scope, channelIds }),
            } satisfies typeof FindMessagesOutput.Type),
          ),
        ),
      ),
    );

const SIMILAR_LIMIT = 10;
const OVER_BUDGET = `${SERVICE_NAME} has used up today's allowance for meaning-based search; use find_messages, or try again after 00:00 UTC`;

const findLike =
  (discordUserId: string) =>
  ({
    serverId,
    query,
    channelId,
    limit,
  }: typeof FindSimilarMessagesInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: serverId, discordUserId })((scope) =>
      withChannel({ scope, channelId: Option.fromUndefinedOr(channelId) })((channelIds) =>
        findSimilar({
          scope,
          query,
          channelIds,
          limit: Option.getOrElse(Option.fromUndefinedOr(limit), () => SIMILAR_LIMIT),
        }).pipe(
          Effect.map((found) => {
            if (found.status === "overBudget") {
              return errorResult(OVER_BUDGET);
            }
            return structuredResult({
              messages: found.messages,
              embedded: found.coverage.embedded,
              stored: found.coverage.stored,
              notFullyIngested: notFullyIngested({ scope, channelIds }),
            } satisfies typeof FindSimilarMessagesOutput.Type);
          }),
        ),
      ),
    );

const read =
  (discordUserId: string) =>
  ({
    serverId,
    channelId,
    before,
    limit,
  }: typeof ReadMessagesInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: serverId, discordUserId })((scope) =>
      withChannel({ scope, channelId: Option.some(channelId) })(() =>
        readMessages({
          scope,
          channelId,
          before: Option.fromUndefinedOr(before),
          limit: limitOf(limit),
        }).pipe(
          Effect.map((messages) =>
            structuredResult({
              ingest: ingestById({ scope, channelId }),
              messages,
            } satisfies typeof ReadMessagesOutput.Type),
          ),
        ),
      ),
    );
const TOOL_BASE = { icons: ICONS, annotations: { readOnlyHint: true, openWorldHint: false } };

const LIST_SERVERS_TOOL = {
  title: "List servers",
  description: `List the Discord servers you can read through ${SERVICE_NAME}. \`ingest\` is \`notConsented\` until the server's admin allows ${SERVICE_NAME} to store its messages; until then every channel reads as empty. ${PHRASES_HINT}`,
  ...TOOL_BASE,
  outputSchema: ListServersOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

const LIST_CHANNELS_TOOL = {
  title: "List channels",
  description: `List the text, voice, announcement, stage and forum channels and the threads (including forum posts) you can read in a server. ${INGEST_GUIDE}`,
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
  description: `Find messages whose text, image description, embed, sticker name or poll contains \`query\` exactly, ignoring letter case. Matching is literal, so try other wordings and synonyms yourself when a search finds little. \`total\` counts the matches in the searched channels, so it shows how often a topic comes up; for queries longer than three characters it can count a few messages that only contain the pieces of \`query\`. \`messages\` holds the exact matches among \`limit\` candidates, newest first, starting at \`offset\`, so it can hold fewer than \`limit\`; advance \`offset\` by \`limit\` to read the next page. \`notFullyIngested\` lists the searched channels whose messages are not all stored yet, so the count may be low. ${INGEST_GUIDE}`,
  ...TOOL_BASE,
  outputSchema: FindMessagesOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: FindMessagesInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

const FIND_SIMILAR_MESSAGES_TOOL = {
  title: "Find similar messages",
  description: `Find messages whose meaning is close to \`query\`, even when they share no words with it, most similar first. Write \`query\` as a sentence or a few words describing what you are looking for. Use it when \`find_messages\` finds nothing because people worded things differently; use \`find_messages\` for exact words, names and counts. \`score\` is the cosine similarity. \`embedded\` of \`stored\` messages can be searched this way so far; older messages are added a day's share at a time, so say so when \`embedded\` is below \`stored\`. ${INGEST_GUIDE}`,
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
  description: `Read the latest messages of a channel, newest first. ${INGEST_GUIDE}`,
  ...TOOL_BASE,
  outputSchema: ReadMessagesOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: ReadMessagesInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

const buildServer = (discordUserId: string): McpServer => {
  const server = new McpServer(SERVER_INFO);
  server.registerTool("list_servers", LIST_SERVERS_TOOL, () => listServers(discordUserId));
  server.registerTool("list_channels", LIST_CHANNELS_TOOL, listChannels(discordUserId));
  server.registerTool(PHRASES_TOOL_NAME, LIST_SERVER_PHRASES_TOOL, phrases(discordUserId));
  server.registerTool("find_messages", FIND_MESSAGES_TOOL, find(discordUserId));
  server.registerTool("find_similar_messages", FIND_SIMILAR_MESSAGES_TOOL, findLike(discordUserId));
  server.registerTool("read_messages", READ_MESSAGES_TOOL, read(discordUserId));
  return server;
};

export { buildServer };
