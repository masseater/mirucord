import type { CallToolResult } from "@modelcontextprotocol/server";
import { Array, Effect, pipe, Schema } from "effect";

import { readableChannels, withScope } from "#/entities/scope/index.server";
import type { GuildScope } from "#/entities/scope/index.server";
import { GetServerOutput } from "#/features/get-server/model/server-output";
import { structuredResult, toolRegistration } from "#/shared/mcp";

import { visibleChannels } from "./channels.server.ts";
import { serverPhrases } from "./phrases.server.ts";

const GetServerInput = Schema.Struct({ serverId: Schema.String });

const GET_SERVER_TOOL = {
  name: "get_server",
  title: "Get server",
  description:
    "Get what a server is made of: the channels and threads you can read, and the phrases, custom emoji and stickers its members keep repeating.",
  outputSchema: GetServerOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: GetServerInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

const readableIds = (scope: GuildScope): readonly string[] =>
  pipe(
    readableChannels(scope),
    Array.map(({ id }) => id),
  );

const serverOf = (scope: GuildScope): Effect.Effect<typeof GetServerOutput.Type> =>
  Effect.all(
    {
      channels: visibleChannels(scope),
      found: serverPhrases({ scope, channelIds: readableIds(scope) }),
    },
    { concurrency: "unbounded" },
  ).pipe(
    Effect.map(({ channels, found }) => ({
      channels,
      days: found.days,
      phrases: found.phrases,
    })),
  );

const getServer =
  (discordUserId: string) =>
  ({ serverId }: typeof GetServerInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: serverId, discordUserId })((scope) =>
      serverOf(scope).pipe(Effect.flatMap(structuredResult)),
    );

export const registerGetServer = toolRegistration({ ...GET_SERVER_TOOL, handler: getServer });
