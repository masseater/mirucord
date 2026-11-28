import type { CallToolResult } from "@modelcontextprotocol/server";
import { Array, Effect, pipe, Schema } from "effect";

import { readableChannels, withScope } from "#/entities/scope/index.server";
import { ChannelOutput } from "#/features/get-server/model/channels-output";
import { ListServerPhrasesOutput } from "#/features/get-server/model/server-phrases-output";
import { structuredResult, toolRegistration } from "#/shared/mcp";

import { visibleChannels } from "./channels.server.ts";
import { serverPhrases } from "./phrases.server.ts";

const ServerInput = Schema.Struct({ serverId: Schema.String });

const ListChannelsOutput = Schema.Struct({
  channels: Schema.Array(ChannelOutput),
});

const listChannels =
  (discordUserId: string) =>
  ({ serverId }: typeof ServerInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: serverId, discordUserId })((scope) =>
      visibleChannels(scope).pipe(
        Effect.flatMap((channels) =>
          structuredResult({ channels } satisfies typeof ListChannelsOutput.Type),
        ),
      ),
    );

const listServerPhrases =
  (discordUserId: string) =>
  ({ serverId }: typeof ServerInput.Type): Promise<CallToolResult> =>
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

export const registerListChannels = toolRegistration({
  name: "list_channels",
  title: "List channels",
  description: "Deprecated, removed in the next release: use get_server.",
  outputSchema: ListChannelsOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: ServerInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  handler: listChannels,
});

export const registerListServerPhrases = toolRegistration({
  name: "list_server_phrases",
  title: "List server phrases",
  description: "Deprecated, removed in the next release: use get_server.",
  outputSchema: ListServerPhrasesOutput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
  inputSchema: ServerInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  handler: listServerPhrases,
});
