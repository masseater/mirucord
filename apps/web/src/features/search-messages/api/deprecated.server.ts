import type { CallToolResult } from "@modelcontextprotocol/server";
import { Effect, Option, Schema } from "effect";

import { notFullyIngested, withChannel, withScope } from "#/entities/scope/index.server";
import { FindMessagesOutput } from "#/features/search-messages/model/exact-output";
import { FindSimilarMessagesOutput } from "#/features/search-messages/model/similar-messages-output";
import { SERVICE_NAME } from "#/shared/config";
import {
  errorResult,
  FIRST_OFFSET,
  Limit,
  limitOf,
  Offset,
  structuredResult,
  toolRegistration,
} from "#/shared/mcp";

import { findMessages } from "./exact.server.ts";
import { findSimilar } from "./similar.server.ts";

const FindMessagesInput = Schema.Struct({
  serverId: Schema.String,
  query: Schema.NonEmptyString,
  channelId: Schema.optionalKey(Schema.String),
  limit: Limit,
  offset: Offset,
});

const FindSimilarMessagesInput = Schema.Struct({
  serverId: Schema.String,
  query: Schema.NonEmptyString,
  channelId: Schema.optionalKey(Schema.String),
  limit: Limit,
});

const SIMILAR_LIMIT = 10;
const OVER_BUDGET = `${SERVICE_NAME} has used up today's allowance for meaning-based search; try again after 00:00 UTC`;

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
          Effect.flatMap((found) => {
            if (found.status === "overBudget") {
              return Effect.succeed(errorResult(OVER_BUDGET));
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

export const registerFindMessages = toolRegistration({
  name: "find_messages",
  title: "Find messages",
  description: "Deprecated, removed in the next release: use search_messages.",
  outputSchema: FindMessagesOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: FindMessagesInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  handler: find,
});

export const registerFindSimilarMessages = toolRegistration({
  name: "find_similar_messages",
  title: "Find similar messages",
  description: "Deprecated, removed in the next release: use search_messages.",
  outputSchema: FindSimilarMessagesOutput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
  inputSchema: FindSimilarMessagesInput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
  handler: findLike,
});
