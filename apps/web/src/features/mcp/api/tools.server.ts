import { McpServer } from "@modelcontextprotocol/server";
import type { CallToolResult } from "@modelcontextprotocol/server";
import { ChannelType } from "discord-api-types/v10";
import { Effect, Option, Schema } from "effect";

import { ingestStatus, isReady } from "#/features/mcp/model/ingest-status";
import type { IngestStatus } from "#/features/mcp/model/ingest-status";
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
        jsonResult(
          guilds.map(({ guildId, name, consent }) => ({ id: guildId, name, ingest: consent })),
        ),
      ),
      Effect.orElseSucceed(() => errorResult(DISCORD_UNAVAILABLE)),
    ),
  );

const visibleChannels = (scope: GuildScope): CallToolResult =>
  jsonResult(
    readableChannels(scope).map((stored) => ({
      id: stored.id,
      name: stored.name,
      type: stored.type,
      parentId: Option.getOrNull(stored.parentId),
      ingest: ingestOf(scope, stored),
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
          Effect.map((messages) =>
            jsonResult({
              messages,
              notFullyIngested: channelIds
                .map((id) => ({ channelId: id, ingest: ingestById(scope, id) }))
                .filter(({ ingest }) => !isReady(ingest)),
            }),
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
          Effect.map((messages) => jsonResult({ ingest: ingestById(scope, channelId), messages })),
        ),
      ),
    );
const toolInput = Schema.toStandardSchemaV1;

const buildServer = (discordUserId: string): McpServer => {
  const server = new McpServer(SERVER_INFO);
  server.registerTool(
    "list_servers",
    {
      description:
        "List the Discord servers you can read through mirucord. `ingest` is `notConsented` until the server's admin allows mirucord to store its messages; until then every channel reads as empty.",
      icons: ICONS,
    },
    () => listServers(discordUserId),
  );
  server.registerTool(
    "list_channels",
    {
      description: `List the text, voice, announcement, stage and forum channels and the threads (including forum posts) you can read in a server. ${INGEST_GUIDE}`,
      icons: ICONS,
      inputSchema: Schema.toStandardJSONSchemaV1(toolInput(ListChannelsInput)),
    },
    listChannels(discordUserId),
  );
  server.registerTool(
    "search_messages",
    {
      description: `Search messages in a server by meaning. \`notFullyIngested\` lists the searched channels whose messages are not all stored yet, so results from them may be missing. ${INGEST_GUIDE}`,
      icons: ICONS,
      inputSchema: Schema.toStandardJSONSchemaV1(toolInput(SearchMessagesInput)),
    },
    search(discordUserId),
  );
  server.registerTool(
    "read_messages",
    {
      description: `Read the latest messages of a channel, newest first. ${INGEST_GUIDE}`,
      icons: ICONS,
      inputSchema: Schema.toStandardJSONSchemaV1(toolInput(ReadMessagesInput)),
    },
    read(discordUserId),
  );
  return server;
};

export { buildServer };
