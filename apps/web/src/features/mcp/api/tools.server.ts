import { McpServer } from "@modelcontextprotocol/server";
import type { CallToolResult } from "@modelcontextprotocol/server";
import { ChannelType } from "discord-api-types/v10";
import { Effect, Option, Schema } from "effect";

import { ingestStatus, isReady } from "#/features/mcp/model/ingest-status";
import type { IngestStatus } from "#/features/mcp/model/ingest-status";
import {
  ListChannelsOutput,
  ListServersOutput,
  ReadMessagesOutput,
  SearchMessagesOutput,
} from "#/features/mcp/model/tool-output";
import { SITE_ORIGIN } from "#/shared/config";
import { CATEGORY_TYPES } from "#/shared/discord";

import { readMessages, searchMessages } from "./messages.server";
import { readableGuilds, resolveScope } from "./scope.server";
import type { GuildScope, StoredChannel } from "./scope.server";

const ICONS = [
  { src: `${SITE_ORIGIN}/apple-touch-icon.png`, mimeType: "image/png", sizes: ["180x180"] },
  { src: `${SITE_ORIGIN}/favicon-32x32.png`, mimeType: "image/png", sizes: ["32x32"] },
];
const SERVER_INFO = { name: "mirucord", version: "0.0.0", icons: ICONS, websiteUrl: SITE_ORIGIN };
const SERVER_NOT_FOUND = "Server not found";
const DISCORD_UNAVAILABLE = "Discord did not answer; try again later";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const CHANNEL_NOT_FOUND = "Channel not found";
const FORUM_TYPES: ReadonlySet<number> = new Set([ChannelType.GuildForum, ChannelType.GuildMedia]);
const INGEST_GUIDE =
  "Each channel carries `ingest`: only `empty` means the channel has no messages in Discord. `notConsented`, `waiting` and `backfilling` mean mirucord has not stored all of its messages yet, so an empty or short result does not mean the channel is empty; say so instead of reporting that there are no messages.";

const Limit = Schema.optionalKey(
  Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_LIMIT })),
);

const ListChannelsInput = Schema.Struct({ serverId: Schema.String });
const SearchMessagesInput = Schema.Struct({
  serverId: Schema.String,
  query: Schema.NonEmptyString,
  channelId: Schema.optionalKey(Schema.String),
  limit: Limit,
});
const ReadMessagesInput = Schema.Struct({
  serverId: Schema.String,
  channelId: Schema.String,
  before: Schema.optionalKey(Schema.String),
  limit: Limit,
});

const structuredResult = (value: Readonly<Record<string, unknown>>): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
  structuredContent: value,
  isError: false,
});
const errorResult = (text: string): CallToolResult => ({
  content: [{ type: "text", text }],
  isError: true,
});

type ToolRequest = Readonly<{ guildId: string; discordUserId: string }>;
type WithinScope = (scope: GuildScope) => Effect.Effect<CallToolResult>;

const scoped = (request: ToolRequest, withinScope: WithinScope): Effect.Effect<CallToolResult> =>
  resolveScope(request).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeed(errorResult(SERVER_NOT_FOUND)),
        onSome: withinScope,
      }),
    ),
    Effect.orElseSucceed(() => errorResult(DISCORD_UNAVAILABLE)),
  );

const withScope = (request: ToolRequest, withinScope: WithinScope): Promise<CallToolResult> =>
  Effect.runPromise(scoped(request, withinScope));

const limitOf = (limit: number | undefined): number =>
  Option.getOrElse(Option.fromUndefinedOr(limit), () => DEFAULT_LIMIT);
const readableChannels = (scope: GuildScope): readonly StoredChannel[] =>
  scope.guild.channels.filter(
    ({ id, type }) => scope.visible.includes(id) && !CATEGORY_TYPES.has(type),
  );

const withChannel = (
  scope: GuildScope,
  channelId: Option.Option<string>,
  withinChannels: (channelIds: readonly string[]) => Effect.Effect<CallToolResult>,
): Effect.Effect<CallToolResult> =>
  Option.match(channelId, {
    onNone: () => withinChannels(readableChannels(scope).map(({ id }) => id)),
    onSome: (id) =>
      Option.match(
        Option.liftPredicate(id, (candidate) => scope.visible.includes(candidate)),
        {
          onNone: () => Effect.succeed(errorResult(CHANNEL_NOT_FOUND)),
          onSome: (visible) =>
            withinChannels([
              visible,
              ...scope.guild.channels
                .filter(
                  ({ id: threadId, parentId }) =>
                    Option.contains(parentId, visible) && scope.visible.includes(threadId),
                )
                .map(({ id: threadId }) => threadId),
            ]),
        },
      ),
  });

const ingestOf = (scope: GuildScope, stored: StoredChannel): IngestStatus => {
  const { consent, channels } = scope.guild;
  if (!FORUM_TYPES.has(stored.type)) {
    return ingestStatus({ consent, kind: "channel", progress: stored });
  }
  const posts = channels.filter(({ parentId }) => Option.contains(parentId, stored.id));
  return ingestStatus({ consent, kind: "forum", posts });
};

const ingestById = (scope: GuildScope, channelId: string): IngestStatus =>
  Option.match(Option.fromUndefinedOr(scope.guild.channels.find(({ id }) => id === channelId)), {
    onNone: () => "waiting" as const,
    onSome: (stored) => ingestOf(scope, stored),
  });

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
      ingest: ingestOf(scope, stored),
    })),
  } satisfies typeof ListChannelsOutput.Type);

const listChannels =
  (discordUserId: string) =>
  ({ serverId }: typeof ListChannelsInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: serverId, discordUserId }, (scope) =>
      Effect.succeed(visibleChannels(scope)),
    );

const search =
  (discordUserId: string) =>
  ({
    serverId,
    query,
    channelId,
    limit,
  }: typeof SearchMessagesInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: serverId, discordUserId }, (scope) =>
      withChannel(scope, Option.fromUndefinedOr(channelId), (channelIds) =>
        searchMessages({ scope, query, channelIds, limit: limitOf(limit) }).pipe(
          Effect.map((messages) =>
            structuredResult({
              messages,
              notFullyIngested: channelIds
                .map((id) => ({ channelId: id, ingest: ingestById(scope, id) }))
                .filter(({ ingest }) => !isReady(ingest)),
            } satisfies typeof SearchMessagesOutput.Type),
          ),
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
    withScope({ guildId: serverId, discordUserId }, (scope) =>
      withChannel(scope, Option.some(channelId), () =>
        readMessages({
          scope,
          channelId,
          before: Option.fromUndefinedOr(before),
          limit: limitOf(limit),
        }).pipe(
          Effect.map((messages) =>
            structuredResult({
              ingest: ingestById(scope, channelId),
              messages,
            } satisfies typeof ReadMessagesOutput.Type),
          ),
        ),
      ),
    );
const TOOL_BASE = { icons: ICONS, annotations: { readOnlyHint: true, openWorldHint: false } };

const LIST_SERVERS_TOOL = {
  title: "List servers",
  description:
    "List the Discord servers you can read through mirucord. `ingest` is `notConsented` until the server's admin allows mirucord to store its messages; until then every channel reads as empty.",
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

const SEARCH_MESSAGES_TOOL = {
  title: "Search messages",
  description: `Search messages in a server by meaning. \`notFullyIngested\` lists the searched channels whose messages are not all stored yet, so results from them may be missing. ${INGEST_GUIDE}`,
  ...TOOL_BASE,
  outputSchema: SearchMessagesOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: SearchMessagesInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
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
  server.registerTool("search_messages", SEARCH_MESSAGES_TOOL, search(discordUserId));
  server.registerTool("read_messages", READ_MESSAGES_TOOL, read(discordUserId));
  return server;
};

export { buildServer };
