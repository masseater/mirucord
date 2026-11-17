import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Effect, Option, Schema } from "effect";

import { guildStore, MessageOutput, openStored } from "#/entities/guild-message/index.server";
import type { MessageView } from "#/entities/guild-message/index.server";
import { IngestOutput, PendingChannelOutput } from "#/entities/scope";
import {
  ingestById,
  notFullyIngested,
  withChannel,
  withScope,
} from "#/entities/scope/index.server";
import type { GuildScope } from "#/entities/scope/index.server";
import { errorResult, Limit, limitOf, structuredResult, TOOL_BASE } from "#/shared/mcp";

export const ReadMessagesInput = Schema.Struct({
  serverId: Schema.String,
  channelId: Schema.optionalKey(
    Schema.String.annotate({ description: "With authorId, this channel and its threads" }),
  ),
  authorId: Schema.optionalKey(
    Schema.String.annotate({
      description: "Messages by this person in every channel you can read",
    }),
  ),
  before: Schema.optionalKey(
    Schema.String.annotate({ description: "The oldest returned id, to read further back" }),
  ),
  limit: Limit,
});

export const ReadMessagesOutput = Schema.Struct({
  ingest: Schema.optionalKey(IngestOutput),
  notFullyIngested: Schema.optionalKey(Schema.Array(PendingChannelOutput)),
  messages: Schema.Array(MessageOutput),
});

const READ_MESSAGES_TOOL = {
  title: "Read messages",
  description: "Read the latest messages of a channel or of one person, newest first.",
  ...TOOL_BASE,
  outputSchema: ReadMessagesOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: ReadMessagesInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

type ReadRequest = Readonly<{
  scope: GuildScope;
  channelId: string;
  before: Option.Option<string>;
  limit: number;
}>;

export const readMessages = (request: ReadRequest): Effect.Effect<readonly MessageView[]> =>
  Effect.promise(() =>
    guildStore(request.scope.guild.guildId).read(request.channelId, {
      before: Option.getOrNull(request.before),
      limit: request.limit,
    }),
  ).pipe(Effect.flatMap((stored) => openStored({ scope: request.scope, stored })));

type AuthorReadRequest = Readonly<{
  scope: GuildScope;
  authorId: string;
  channelIds: readonly string[];
  before: Option.Option<string>;
  limit: number;
}>;

const readAuthorMessages = (request: AuthorReadRequest): Effect.Effect<readonly MessageView[]> =>
  Effect.promise(() =>
    guildStore(request.scope.guild.guildId).readByAuthor({
      authorId: request.authorId,
      channelIds: request.channelIds,
      before: Option.getOrNull(request.before),
      limit: request.limit,
    }),
  ).pipe(Effect.flatMap((stored) => openStored({ scope: request.scope, stored })));

const NEEDS_CHANNEL_OR_AUTHOR = "Pass channelId, authorId or both";

const readChannel = (
  scope: GuildScope,
  request: Readonly<{ channelId: string; before: Option.Option<string>; limit: number }>,
): Effect.Effect<CallToolResult> =>
  withChannel({ scope, channelId: Option.some(request.channelId) })(() =>
    readMessages({ scope, ...request }).pipe(
      Effect.flatMap((messages) =>
        structuredResult({
          ingest: ingestById({ scope, channelId: request.channelId }),
          messages,
        } satisfies typeof ReadMessagesOutput.Type),
      ),
    ),
  );

const readAuthor = (
  scope: GuildScope,
  request: Readonly<{
    authorId: string;
    channelId: Option.Option<string>;
    before: Option.Option<string>;
    limit: number;
  }>,
): Effect.Effect<CallToolResult> =>
  withChannel({ scope, channelId: request.channelId })((channelIds) =>
    readAuthorMessages({ scope, ...request, channelIds }).pipe(
      Effect.flatMap((messages) =>
        structuredResult({
          notFullyIngested: notFullyIngested({ scope, channelIds }),
          messages,
        } satisfies typeof ReadMessagesOutput.Type),
      ),
    ),
  );

const readTool =
  (discordUserId: string) =>
  ({
    serverId,
    channelId,
    authorId,
    before,
    limit,
  }: typeof ReadMessagesInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: serverId, discordUserId })((scope) => {
      const page = { before: Option.fromUndefinedOr(before), limit: limitOf(limit) };
      return Option.match(Option.fromUndefinedOr(authorId), {
        onSome: (author) =>
          readAuthor(scope, {
            ...page,
            authorId: author,
            channelId: Option.fromUndefinedOr(channelId),
          }),
        onNone: () =>
          Option.match(Option.fromUndefinedOr(channelId), {
            onSome: (id) => readChannel(scope, { ...page, channelId: id }),
            onNone: () => Effect.succeed(errorResult(NEEDS_CHANNEL_OR_AUTHOR)),
          }),
      });
    });

export const registerReadMessages =
  (discordUserId: string) =>
  (server: McpServer): void => {
    server.registerTool("read_messages", READ_MESSAGES_TOOL, readTool(discordUserId));
  };
