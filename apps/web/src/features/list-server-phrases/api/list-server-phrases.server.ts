import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Array, Effect, pipe, Schema } from "effect";

import { readableChannels, withScope } from "#/entities/scope/index.server";
import { structuredResult, TOOL_BASE } from "#/shared/mcp";

import { serverPhrases } from "./phrases.server";

const ListServerPhrasesInput = Schema.Struct({ serverId: Schema.String });

const ServerPhrase = Schema.Struct({
  kind: Schema.Literals(["text", "emoji", "sticker"]),
  phrase: Schema.String,
  uses: Schema.Int,
  people: Schema.Int,
  lastUsedAt: Schema.String,
  channels: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
  examples: Schema.Array(Schema.Array(Schema.String)).annotate({
    description: "Each with the message before it",
  }),
  note: Schema.NullOr(Schema.String).annotate({
    description: "AI-written line on how this server uses it",
  }),
});

export const ListServerPhrasesOutput = Schema.Struct({
  days: Schema.Int,
  phrases: Schema.Array(ServerPhrase).annotate({
    description:
      "The server's own greetings, reactions and in-jokes, not news. Common words are left out",
  }),
});

const LIST_SERVER_PHRASES_TOOL = {
  title: "List server phrases",
  description:
    "List the phrases, custom emoji and stickers a server's members keep repeating. Call it once per server before reading messages.",
  ...TOOL_BASE,
  outputSchema: ListServerPhrasesOutput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
  inputSchema: ListServerPhrasesInput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
};

const listServerPhrases =
  (discordUserId: string) =>
  ({ serverId }: typeof ListServerPhrasesInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: serverId, discordUserId })((scope) =>
      serverPhrases({
        scope,
        channelIds: pipe(
          readableChannels(scope),
          Array.map(({ id }) => id),
        ),
      }).pipe(
        Effect.flatMap((found) =>
          structuredResult(found satisfies typeof ListServerPhrasesOutput.Type),
        ),
      ),
    );

export const registerListServerPhrases =
  (discordUserId: string) =>
  (server: McpServer): void => {
    server.registerTool(
      "list_server_phrases",
      LIST_SERVER_PHRASES_TOOL,
      listServerPhrases(discordUserId),
    );
  };
