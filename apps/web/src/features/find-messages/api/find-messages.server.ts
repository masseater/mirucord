import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Array, Effect, Option, pipe, Schema } from "effect";

import {
  containsQuery,
  MessageOutput,
  openStored,
  queryTokens,
  searchableTexts,
  searchMessages,
} from "#/entities/guild-message/index.server";
import type { MessageView } from "#/entities/guild-message/index.server";
import { NotFullyIngestedOutput } from "#/entities/scope";
import { notFullyIngested, withChannel, withScope } from "#/entities/scope/index.server";
import type { GuildScope } from "#/entities/scope/index.server";
import { openSearchKey } from "#/shared/crypto/index.server";
import { FIRST_OFFSET, Limit, limitOf, Offset, structuredResult, TOOL_BASE } from "#/shared/mcp";

export const FindMessagesInput = Schema.Struct({
  serverId: Schema.String,
  query: Schema.NonEmptyString.annotate({
    description:
      "Matched literally, ignoring case, in text, image descriptions, embeds, stickers and polls. Try other wordings yourself",
  }),
  channelId: Schema.optionalKey(Schema.String),
  limit: Limit,
  offset: Offset,
});

export const FindMessagesOutput = Schema.Struct({
  total: Schema.Int.annotate({
    description:
      "Matches in the searched channels. Queries over three characters may count a few partial matches",
  }),
  messages: Schema.Array(MessageOutput).annotate({
    description: "Exact matches among limit candidates, so it can hold fewer than limit",
  }),
  notFullyIngested: NotFullyIngestedOutput,
});

const FIND_MESSAGES_TOOL = {
  title: "Find messages",
  description: "Find messages that contain exact words.",
  ...TOOL_BASE,
  outputSchema: FindMessagesOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: FindMessagesInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

type FindRequest = Readonly<{
  scope: GuildScope;
  query: string;
  channelIds: readonly string[];
  limit: number;
  offset: number;
}>;

type FoundMessages = Readonly<{ total: number; messages: readonly MessageView[] }>;

const NOTHING_FOUND: FoundMessages = { total: 0, messages: [] };

const findMessages = (request: FindRequest): Effect.Effect<FoundMessages> => {
  const { guildId, wrappedKey, consent } = request.scope.guild;
  if (consent !== "consented") {
    return Effect.succeed(NOTHING_FOUND);
  }
  return openSearchKey(wrappedKey).pipe(
    Effect.flatMap((key) => queryTokens({ key, query: request.query })),
    Effect.flatMap((tokens) =>
      searchMessages({
        guildId,
        tokens,
        channelIds: request.channelIds,
        offset: request.offset,
        limit: request.limit,
      }),
    ),
    Effect.flatMap(({ total, entries }) =>
      openStored({ scope: request.scope, stored: entries }).pipe(
        Effect.map((views) => ({
          total,
          messages: pipe(
            views,
            Array.filter((view) =>
              containsQuery({ texts: searchableTexts(view), query: request.query }),
            ),
          ),
        })),
      ),
    ),
  );
};

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
          Effect.flatMap(({ total, messages }) =>
            structuredResult({
              total,
              messages,
              notFullyIngested: notFullyIngested({ scope, channelIds }),
            } satisfies typeof FindMessagesOutput.Type),
          ),
        ),
      ),
    );

export const registerFindMessages =
  (discordUserId: string) =>
  (server: McpServer): void => {
    server.registerTool("find_messages", FIND_MESSAGES_TOOL, find(discordUserId));
  };
