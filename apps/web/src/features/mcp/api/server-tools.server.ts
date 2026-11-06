import type { CallToolResult } from "@modelcontextprotocol/server";
import { Array, DateTime, Effect, Option, pipe } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import type { ListChannelsInput } from "#/features/mcp/api/tool-input";
import type {
  ListChannelsOutput,
  ListServerPhrasesOutput,
  ListServersOutput,
} from "#/features/mcp/api/tool-output";
import { runTraced } from "#/shared/observability/index.server";

import { serverPhrases } from "./phrases.server";
import { readableGuilds } from "./scope.server";
import type { GuildScope } from "./scope.server";
import {
  DISCORD_UNAVAILABLE,
  errorResult,
  ingestOf,
  readableChannels,
  structuredResult,
  withScope,
} from "./tool-scope.server";

const PHRASES_TOOL_NAME = "list_server_phrases";
const PHRASES_HINT = `Before reading messages, call \`${PHRASES_TOOL_NAME}\` once for this server: it lists the phrases, custom emoji and stickers its members keep repeating, so you can read them as the server's own in-jokes and greetings instead of working out each one.`;

const listServers = (discordUserId: string): Promise<CallToolResult> =>
  runTraced(
    readableGuilds(discordUserId).pipe(
      Effect.flatMap((guilds) =>
        structuredResult({
          servers: pipe(
            guilds,
            Array.map(({ guildId, name, consent }) => ({
              id: guildId,
              name,
              ingest: consent,
            })),
          ),
        } satisfies typeof ListServersOutput.Type),
      ),
      Effect.orElseSucceed(() => errorResult(DISCORD_UNAVAILABLE)),
    ),
  );

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

const visibleChannels = ({
  scope,
  hint,
}: Readonly<{ scope: GuildScope; hint: string }>): Effect.Effect<CallToolResult> => {
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
        hint,
      } satisfies typeof ListChannelsOutput.Type),
    ),
  );
};

const listChannels =
  (discordUserId: string) =>
  ({ serverId }: typeof ListChannelsInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: serverId, discordUserId })((scope) =>
      visibleChannels({ scope, hint: PHRASES_HINT }),
    );

const phrases =
  (discordUserId: string) =>
  ({ serverId }: typeof ListChannelsInput.Type): Promise<CallToolResult> =>
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

export { listChannels, listServers, phrases, PHRASES_HINT, PHRASES_TOOL_NAME };
