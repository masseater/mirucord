import type { CallToolResult } from "@modelcontextprotocol/server";
import { Array, Effect, Option, pipe, Schema, Struct } from "effect";

import { notFullyIngested, withChannel, withScope } from "#/entities/scope/index.server";
import type { GuildScope } from "#/entities/scope/index.server";
import { SearchMessagesOutput } from "#/features/search-messages/model/search-output";
import {
  BAD_CURSOR,
  Cursor,
  errorResult,
  FIRST_OFFSET,
  hasBadCursor,
  Limit,
  limitOf,
  nextCursorOf,
  offsetOfCursor,
  structuredResult,
  toolRegistration,
} from "#/shared/mcp";

import { findMessages } from "./exact.server.ts";
import type { FoundMessages } from "./exact.server.ts";
import { findSimilar } from "./similar.server.ts";
import type { SimilarMessages } from "./similar.server.ts";

const SearchMessagesInput = Schema.Struct({
  serverId: Schema.String,
  query: Schema.NonEmptyString.annotate({
    description:
      "Words or a sentence. Messages containing it literally (ignoring case, in text, image descriptions, embeds, stickers and polls) and messages close in meaning are both returned",
  }),
  channelId: Schema.optionalKey(Schema.String),
  limit: Limit,
  cursor: Cursor,
});

const SEARCH_MESSAGES_TOOL = {
  name: "search_messages",
  title: "Search messages",
  description: "Search a server's messages by exact words and by meaning together.",
  outputSchema: SearchMessagesOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: SearchMessagesInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

const SIMILAR_LIMIT = 10;
const NO_SCORE = Option.getOrNull(Option.none<number>());
const NO_COUNT = Option.getOrNull(Option.none<number>());

type Input = typeof SearchMessagesInput.Type;
type Output = typeof SearchMessagesOutput.Type;
type Found = Readonly<{
  exact: FoundMessages;
  meaning: SimilarMessages | Readonly<{ status: "firstPageOnly" }>;
}>;

const exactOf = (messages: FoundMessages["messages"]): Output["messages"] =>
  pipe(
    messages,
    Array.map((message) => Struct.assign(message, { match: "exact" as const, score: NO_SCORE })),
  );

const meaningOf = (found: Found): Output["messages"] => {
  if (found.meaning.status !== "found") {
    return [];
  }
  const exactIds = new Set(
    pipe(
      found.exact.messages,
      Array.map(({ id }) => id),
    ),
  );
  return pipe(
    found.meaning.messages,
    Array.filter(({ id }) => !exactIds.has(id)),
    Array.map((message) => Struct.assign(message, { match: "meaning" as const })),
  );
};

const coverageOf = (found: Found): Pick<Output, "embedded" | "stored"> => {
  if (found.meaning.status !== "found") {
    return { embedded: NO_COUNT, stored: NO_COUNT };
  }
  return found.meaning.coverage;
};

const meaningStatusOf = (found: Found): Output["meaning"] => {
  if (found.meaning.status === "found") {
    return "included";
  }
  return found.meaning.status;
};

type Page = Readonly<{ offset: number; limit: number }>;

const outputOf = ({
  scope,
  channelIds,
  page,
  found,
}: Readonly<{
  scope: GuildScope;
  channelIds: readonly string[];
  page: Page;
  found: Found;
}>): Output => ({
  total: found.exact.total,
  messages: [...exactOf(found.exact.messages), ...meaningOf(found)],
  meaning: meaningStatusOf(found),
  ...coverageOf(found),
  nextCursor: Option.getOrNull(
    nextCursorOf({ offset: page.offset, shown: page.limit, total: found.exact.total }),
  ),
  notFullyIngested: notFullyIngested({ scope, channelIds }),
});

const meaningSearch = (
  request: Readonly<{ scope: GuildScope; query: string; channelIds: readonly string[] }>,
  offset: number,
): Effect.Effect<Found["meaning"]> => {
  if (offset > FIRST_OFFSET) {
    return Effect.succeed({ status: "firstPageOnly" });
  }
  return findSimilar({ ...request, limit: SIMILAR_LIMIT });
};

const search = (
  scope: GuildScope,
  channelIds: readonly string[],
  input: Input,
): Effect.Effect<CallToolResult> => {
  const page: Page = {
    offset: pipe(
      Option.fromUndefinedOr(input.cursor),
      Option.flatMap(offsetOfCursor),
      Option.getOrElse(() => FIRST_OFFSET),
    ),
    limit: limitOf(input.limit),
  };
  const { query } = input;
  return Effect.all(
    {
      exact: findMessages({ scope, query, channelIds, ...page }),
      meaning: meaningSearch({ scope, query, channelIds }, page.offset),
    },
    { concurrency: "unbounded" },
  ).pipe(
    Effect.map((found) => outputOf({ scope, channelIds, page, found })),
    Effect.flatMap(structuredResult),
  );
};

const searchTool =
  (discordUserId: string) =>
  (input: Input): Promise<CallToolResult> => {
    if (hasBadCursor(input.cursor)) {
      return Promise.resolve(errorResult(BAD_CURSOR));
    }
    return withScope({ guildId: input.serverId, discordUserId })((scope) =>
      withChannel({ scope, channelId: Option.fromUndefinedOr(input.channelId) })((channelIds) =>
        search(scope, channelIds, input),
      ),
    );
  };

export const registerSearchMessages = toolRegistration({
  ...SEARCH_MESSAGES_TOOL,
  handler: searchTool,
});
