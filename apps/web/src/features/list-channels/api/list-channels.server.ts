import type { CallToolResult } from "@modelcontextprotocol/server";
import { Array, DateTime, Effect, Option, pipe, Schema } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import { IngestOutput } from "#/entities/scope";
import { ingestOf, readableChannels, withScope } from "#/entities/scope/index.server";
import type { GuildScope } from "#/entities/scope/index.server";
import { structuredResult, toolRegistration } from "#/shared/mcp";

const ListChannelsInput = Schema.Struct({ serverId: Schema.String });

const Channel = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  type: Schema.Int,
  parentId: Schema.NullOr(Schema.String),
  ingest: IngestOutput,
  oldestStoredAt: Schema.NullOr(Schema.String).annotate({
    description:
      "Nothing older is stored, so people missing before it may only be missing from the data",
  }),
});

const ListChannelsOutput = Schema.Struct({
  channels: Schema.Array(Channel),
  hint: Schema.String,
});

const LIST_CHANNELS_TOOL = {
  name: "list_channels",
  title: "List channels",
  description: "List the channels and threads you can read in a server.",
  outputSchema: ListChannelsOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: ListChannelsInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

const PHRASES_HINT =
  "Before reading messages, call `list_server_phrases` once for this server: it lists the phrases, custom emoji and stickers its members keep repeating, so you can read them as the server's own in-jokes and greetings instead of working out each one.";

const oldestStored = (
  scope: GuildScope,
  channelIds: readonly string[],
): Effect.Effect<ReadonlyMap<string, string>> => {
  if (scope.guild.consent !== "consented") {
    return Effect.succeed(new Map());
  }
  return Effect.promise(() => guildStore(scope.guild.guildId).oldestByChannel(channelIds)).pipe(
    Effect.map(
      (oldest) =>
        new Map(
          pipe(
            oldest,
            Array.map(
              ({ channelId, oldest: createdAt }) =>
                [channelId, DateTime.formatIso(DateTime.makeUnsafe(createdAt))] as const,
            ),
          ),
        ),
    ),
  );
};

const visibleChannels = (scope: GuildScope): Effect.Effect<CallToolResult> => {
  const channels = readableChannels(scope);
  return oldestStored(
    scope,
    pipe(
      channels,
      Array.map(({ id }) => id),
    ),
  ).pipe(
    Effect.flatMap((oldest) =>
      structuredResult({
        channels: pipe(
          channels,
          Array.map((stored) => ({
            id: stored.id,
            name: stored.name,
            type: stored.type,
            parentId: Option.getOrNull(stored.parentId),
            ingest: ingestOf({ scope, stored }),
            oldestStoredAt: Option.getOrNull(Option.fromUndefinedOr(oldest.get(stored.id))),
          })),
        ),
        hint: PHRASES_HINT,
      } satisfies typeof ListChannelsOutput.Type),
    ),
  );
};

const listChannels =
  (discordUserId: string) =>
  ({ serverId }: typeof ListChannelsInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: serverId, discordUserId })(visibleChannels);

export const registerListChannels = toolRegistration({
  ...LIST_CHANNELS_TOOL,
  handler: listChannels,
});
