import type { CallToolResult } from "@modelcontextprotocol/server";
import { Effect, Option } from "effect";

import { FIRST_OFFSET, limitOf } from "#/features/mcp/api/tool-input";
import type {
  FindMessagesInput,
  FindSimilarMessagesInput,
  ReadMessagesInput,
} from "#/features/mcp/api/tool-input";
import type {
  FindMessagesOutput,
  FindSimilarMessagesOutput,
  ReadMessagesOutput,
} from "#/features/mcp/api/tool-output";
import { SERVICE_NAME } from "#/shared/config";

import { findMessages, readAuthorMessages, readMessages } from "./messages.server";
import type { GuildScope } from "./scope.server";
import { findSimilar } from "./similar.server";
import {
  errorResult,
  ingestById,
  notFullyIngested,
  structuredResult,
  withChannel,
  withScope,
} from "./tool-scope.server";

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

const NEEDS_CHANNEL_OR_AUTHOR = "Pass channelId, authorId or both";

const readChannel = (
  scope: GuildScope,
  request: Readonly<{ channelId: string; before: Option.Option<string>; limit: number }>,
): Effect.Effect<CallToolResult> =>
  withChannel({ scope, channelId: Option.some(request.channelId) })(() =>
    readMessages({ scope, ...request }).pipe(
      Effect.map((messages) =>
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
      Effect.map((messages) =>
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

export { find, findLike, readTool };
