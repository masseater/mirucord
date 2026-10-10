import { McpServer } from "@modelcontextprotocol/server";
import type { CallToolResult } from "@modelcontextprotocol/server";
import { Array, Effect, Option, Schema, pipe } from "effect";

import { runRequest } from "#/shared/lib/index.server";

import { readMessages, searchMessages } from "./messages.server";
import { listGuildIds, resolveScope } from "./scope.server";
import type { GuildScope } from "./scope.server";

const SERVER_INFO = { name: "mirucord", version: "0.0.0" };
const SERVER_NOT_FOUND = "Server not found";
const DISCORD_UNAVAILABLE = "Discord did not answer; try again later";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const CHANNEL_NOT_FOUND = "Channel not found";

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
const textResult = (text: string, isError: boolean): CallToolResult => ({
  content: [{ type: "text", text }],
  isError,
});
const jsonResult = (value: unknown): CallToolResult => textResult(JSON.stringify(value), false);
const errorResult = (text: string): CallToolResult => textResult(text, true);

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
  runRequest(scoped(request, withinScope));

const limitOf = (limit: number | undefined): number =>
  Option.getOrElse(Option.fromUndefinedOr(limit), () => DEFAULT_LIMIT);
const withChannel = (
  scope: GuildScope,
  channelId: Option.Option<string>,
  withinChannels: (channelIds: readonly string[]) => Effect.Effect<CallToolResult>,
): Effect.Effect<CallToolResult> =>
  Option.match(channelId, {
    onNone: () => withinChannels(scope.visible),
    onSome: (id) =>
      Option.match(
        Option.liftPredicate(id, (candidate) => scope.visible.includes(candidate)),
        {
          onNone: () => Effect.succeed(errorResult(CHANNEL_NOT_FOUND)),
          onSome: (visible) => withinChannels([visible]),
        },
      ),
  });

const listServers = (discordUserId: string): Promise<CallToolResult> =>
  runRequest(
    listGuildIds.pipe(
      Effect.flatMap((guildIds) =>
        pipe(
          guildIds,
          Effect.forEach((guildId) => resolveScope({ guildId, discordUserId })),
        ),
      ),
      Effect.map((scopes) =>
        jsonResult(
          Array.getSomes(scopes).map(({ guild }) => ({
            id: guild.guildId,
            name: guild.name,
          })),
        ),
      ),
      Effect.orElseSucceed(() => errorResult(DISCORD_UNAVAILABLE)),
    ),
  );

const visibleChannels = (scope: GuildScope): CallToolResult =>
  jsonResult(
    scope.guild.channels
      .filter(({ id }) => scope.visible.includes(id))
      .map(({ id, name, type, parentId }) => ({
        id,
        name,
        type,
        parentId: Option.getOrNull(parentId),
      })),
  );

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
          Effect.map(jsonResult),
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
        }).pipe(Effect.map(jsonResult)),
      ),
    );
const toolInput = Schema.toStandardSchemaV1;

const buildServer = (discordUserId: string): McpServer => {
  const server = new McpServer(SERVER_INFO);
  server.registerTool(
    "list_servers",
    { description: "List the Discord servers you can read through mirucord." },
    () => listServers(discordUserId),
  );
  server.registerTool(
    "list_channels",
    {
      description: "List the channels and threads you can read in a server.",
      inputSchema: Schema.toStandardJSONSchemaV1(toolInput(ListChannelsInput)),
    },
    listChannels(discordUserId),
  );
  server.registerTool(
    "search_messages",
    {
      description: "Search messages in a server by meaning.",
      inputSchema: Schema.toStandardJSONSchemaV1(toolInput(SearchMessagesInput)),
    },
    search(discordUserId),
  );
  server.registerTool(
    "read_messages",
    {
      description: "Read the latest messages of a channel, newest first.",
      inputSchema: Schema.toStandardJSONSchemaV1(toolInput(ReadMessagesInput)),
    },
    read(discordUserId),
  );
  return server;
};

export { buildServer };
