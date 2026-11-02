import type { CallToolResult } from "@modelcontextprotocol/server";
import { Array, DateTime, Effect, Option, pipe, Record } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import type { StoredThreadMember } from "#/entities/guild-message/index.server";
import { memberLimitOf, FIRST_OFFSET } from "#/features/mcp/api/tool-input";
import type { ListThreadMembersInput } from "#/features/mcp/api/tool-input";
import type { ListThreadMembersOutput } from "#/features/mcp/api/tool-output";
import { isThread } from "#/shared/permissions";

import { liveThreadMembersKeptOf } from "./kept-users.server";
import type { GuildScope } from "./scope.server";
import { channelNamesOf } from "./span-scope.server";
import { DISCORD_UNAVAILABLE, errorResult, structuredResult, withScope } from "./tool-scope.server";

type Output = typeof ListThreadMembersOutput.Type;

type Input = typeof ListThreadMembersInput.Type;

type ThreadRequest = Readonly<{ scope: GuildScope; input: Input }>;

const NOT_CONSENTED: Output = {
  ingest: "notConsented",
  total: 0,
  members: [],
  liveUserIds: Option.getOrNull(Option.none()),
};

const isoOf = (at: number): string => DateTime.formatIso(DateTime.makeUnsafe(at));

const threadIdsOf = ({ scope, input }: ThreadRequest): readonly string[] => {
  const threads = pipe(
    scope.guild.channels,
    Array.filter(isThread),
    Array.map(({ id }) => id),
    Array.intersection(scope.visible),
  );
  return Option.match(Option.fromUndefinedOr(input.threadId), {
    onNone: () => threads,
    onSome: (wanted) => Array.intersection(threads, [wanted]),
  });
};

const viewOf =
  (names: Record.ReadonlyRecord<string, string>) =>
  (member: StoredThreadMember): Output["members"][number] => ({
    threadId: member.threadId,
    threadName: Option.getOrNull(Record.get(names, member.threadId)),
    userId: member.userId,
    joinedAt: isoOf(member.joinedAt),
    leftAt: Option.getOrNull(Option.map(Option.fromNullOr(member.leftAt), isoOf)),
  });

const storedOf = (request: ThreadRequest): Effect.Effect<Omit<Output, "liveUserIds">> => {
  const { scope, input } = request;
  const lookup = {
    threadIds: threadIdsOf(request),
    userIds: Option.getOrNull(Option.fromUndefinedOr(input.userIds)),
    includeLeft: Option.getOrElse(Option.fromUndefinedOr(input.includeLeft), () => false),
    limit: memberLimitOf(input.limit),
    offset: Option.getOrElse(Option.fromUndefinedOr(input.offset), () => FIRST_OFFSET),
  };
  const view = viewOf(channelNamesOf(scope));
  return Effect.promise(() => guildStore(scope.guild.guildId).readThreadMembers(lookup)).pipe(
    Effect.map(({ total, members }) => ({
      ingest: "consented" as const,
      total,
      members: pipe(members, Array.map(view)),
    })),
  );
};

const liveThreadOf = (request: ThreadRequest): Option.Option<string> =>
  pipe(
    Option.fromUndefinedOr(request.input.threadId),
    Option.flatMap(() => Array.head(threadIdsOf(request))),
  );

const threadMembersOf = (request: ThreadRequest): Effect.Effect<CallToolResult> =>
  Effect.all({
    stored: storedOf(request),
    live: liveThreadMembersKeptOf(request.scope.guild.guildId)(liveThreadOf(request)),
  }).pipe(
    Effect.map(({ stored, live }) => structuredResult({ ...stored, liveUserIds: live })),
    Effect.orElseSucceed(() => errorResult(DISCORD_UNAVAILABLE)),
  );

const listThreadMembers =
  (discordUserId: string) =>
  (input: typeof ListThreadMembersInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: input.serverId, discordUserId })((scope) => {
      if (scope.guild.consent !== "consented") {
        return Effect.succeed(structuredResult(NOT_CONSENTED));
      }
      return threadMembersOf({ scope, input });
    });

export { listThreadMembers };
