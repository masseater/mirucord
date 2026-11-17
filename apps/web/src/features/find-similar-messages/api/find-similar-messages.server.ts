import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Effect, Option, Schema } from "effect";

import { MessageOutput } from "#/entities/guild-message/index.server";
import { NotFullyIngestedOutput } from "#/entities/scope";
import { notFullyIngested, withChannel, withScope } from "#/entities/scope/index.server";
import { SERVICE_NAME } from "#/shared/config";
import { errorResult, Limit, structuredResult, TOOL_BASE } from "#/shared/mcp";

import { findSimilar } from "./similar.server";

export const FindSimilarMessagesInput = Schema.Struct({
  serverId: Schema.String,
  query: Schema.NonEmptyString.annotate({
    description: "A sentence or a few words describing what you look for",
  }),
  channelId: Schema.optionalKey(Schema.String),
  limit: Limit,
});

const SimilarMessage = Schema.Struct({
  ...MessageOutput.fields,
  score: Schema.Finite.annotate({ description: "Cosine similarity" }),
});

export const FindSimilarMessagesOutput = Schema.Struct({
  messages: Schema.Array(SimilarMessage).annotate({
    description:
      "The closest messages, even when none is about query. Read them before treating them as matches",
  }),
  embedded: Schema.Int.annotate({
    description:
      "Messages searchable by meaning so far. Older ones are added daily, so say so when below stored",
  }),
  stored: Schema.Int,
  notFullyIngested: NotFullyIngestedOutput,
});

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

export const registerFindSimilarMessages =
  (discordUserId: string) =>
  (server: McpServer): void => {
    server.registerTool(
      "find_similar_messages",
      FIND_SIMILAR_MESSAGES_TOOL,
      findLike(discordUserId),
    );
  };
