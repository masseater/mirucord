import type { CallToolResult } from "@modelcontextprotocol/server";
import { Array, Effect, Option, pipe } from "effect";

import { ingestStatus, isReady } from "#/features/mcp/model/ingest-status";
import type { IngestStatus } from "#/features/mcp/model/ingest-status";
import { CATEGORY_TYPES, FORUM_TYPES } from "#/shared/discord";

import { resolveScope } from "./scope.server";
import type { GuildScope, StoredChannel } from "./scope.server";

const SERVER_NOT_FOUND = "Server not found";
const DISCORD_UNAVAILABLE = "Discord did not answer; try again later";
const CHANNEL_NOT_FOUND = "Channel not found";

const structuredResult = (value: Readonly<Record<string, unknown>>): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
  structuredContent: value,
  isError: false,
});
const errorResult = (text: string): CallToolResult => ({
  content: [{ type: "text", text }],
  isError: true,
});

type ToolRequest = Readonly<{ guildId: string; discordUserId: string }>;
type WithinScope = (scope: GuildScope) => Effect.Effect<CallToolResult>;

const scoped = (request: ToolRequest, withinScope: WithinScope): Effect.Effect<CallToolResult> =>
  resolveScope(request).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeed(errorResult(SERVER_NOT_FOUND)),
        onSome: withinScope,
      }),
    ),
    Effect.orElseSucceed(() => errorResult(DISCORD_UNAVAILABLE)),
  );

const withScope =
  (request: Readonly<{ guildId: string; discordUserId: string }>) =>
  (withinScope: (scope: GuildScope) => Effect.Effect<CallToolResult>): Promise<CallToolResult> =>
    Effect.runPromise(scoped(request, withinScope));

const readableChannels = (scope: GuildScope): readonly StoredChannel[] =>
  pipe(
    scope.guild.channels,
    Array.filter(({ id, type }) => scope.visible.includes(id) && !CATEGORY_TYPES.has(type)),
  );

const withChannel =
  ({ scope, channelId }: Readonly<{ scope: GuildScope; channelId: Option.Option<string> }>) =>
  (
    withinChannels: (channelIds: readonly string[]) => Effect.Effect<CallToolResult>,
  ): Effect.Effect<CallToolResult> =>
    Option.match(channelId, {
      onNone: () =>
        withinChannels(
          pipe(
            readableChannels(scope),
            Array.map(({ id }) => id),
          ),
        ),
      onSome: (id) =>
        Option.match(
          Option.liftPredicate(id, (candidate) => scope.visible.includes(candidate)),
          {
            onNone: () => Effect.succeed(errorResult(CHANNEL_NOT_FOUND)),
            onSome: (visible) =>
              withinChannels([
                visible,
                ...pipe(
                  scope.guild.channels,
                  Array.filter(
                    ({ id: threadId, parentId }) =>
                      Option.contains(parentId, visible) && scope.visible.includes(threadId),
                  ),
                  Array.map(({ id: threadId }) => threadId),
                ),
              ]),
          },
        ),
    });

const ingestOf = ({
  scope,
  stored,
}: Readonly<{ scope: GuildScope; stored: StoredChannel }>): IngestStatus => {
  const { consent, channels } = scope.guild;
  if (!FORUM_TYPES.has(stored.type)) {
    return ingestStatus({ consent, kind: "channel", progress: stored });
  }
  const posts = pipe(
    channels,
    Array.filter(({ parentId }) => Option.contains(parentId, stored.id)),
  );
  return ingestStatus({ consent, kind: "forum", posts });
};

const ingestById = ({
  scope,
  channelId,
}: Readonly<{ scope: GuildScope; channelId: string }>): IngestStatus =>
  pipe(
    scope.guild.channels,
    Array.findFirst(({ id }) => id === channelId),
    Option.match({
      onNone: () => "waiting" as const,
      onSome: (stored) => ingestOf({ scope, stored }),
    }),
  );

const notFullyIngested = ({
  scope,
  channelIds,
}: Readonly<{
  scope: GuildScope;
  channelIds: readonly string[];
}>): readonly Readonly<{ channelId: string; ingest: IngestStatus }>[] =>
  pipe(
    channelIds,
    Array.map((id) => ({ channelId: id, ingest: ingestById({ scope, channelId: id }) })),
    Array.filter(({ ingest }) => !isReady(ingest)),
  );

export {
  DISCORD_UNAVAILABLE,
  errorResult,
  ingestById,
  ingestOf,
  notFullyIngested,
  readableChannels,
  structuredResult,
  withChannel,
  withScope,
};
