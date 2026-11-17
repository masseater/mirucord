import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Array, Effect, pipe, Schema } from "effect";

import { readableChannels, withScope } from "#/entities/scope/index.server";
import { ListServerPhrasesOutput } from "#/features/list-server-phrases/model/server-phrases-output";
import { structuredResult, TOOL_BASE } from "#/shared/mcp";

import { serverPhrases } from "./phrases.server";

const ListServerPhrasesInput = Schema.Struct({ serverId: Schema.String });

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
