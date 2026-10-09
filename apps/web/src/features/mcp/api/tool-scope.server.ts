import type { CallToolResult } from "@modelcontextprotocol/server";
import { Effect, Function, Option } from "effect";

import { runRequest } from "#/shared/lib/index.server";

import { resolveScope } from "./scope.server";
import type { GuildScope } from "./scope.server";
import { recordSupportAccess } from "./support.server";

const SERVER_NOT_FOUND = "Server not found";
const DISCORD_UNAVAILABLE = "Discord did not answer; try again later";
const DATA_FIRST_ARITY = 2;

type ToolRequest = Readonly<{
  tool: string;
  guildId: string;
  discordUserId: string;
  channelId: Option.Option<string>;
}>;

const textResult = (text: string, isError: boolean): CallToolResult => ({
  content: [{ type: "text", text }],
  isError,
});

const jsonResult = (value: unknown): CallToolResult => textResult(JSON.stringify(value), false);

const errorResult = (text: string): CallToolResult => textResult(text, true);
const auditSupport = (request: ToolRequest, scope: GuildScope): Effect.Effect<void> =>
  Option.match(
    Option.liftPredicate(scope, ({ access }) => access === "support"),
    {
      onNone: () => Effect.void,
      onSome: () =>
        recordSupportAccess({
          guildId: request.guildId,
          operatorId: request.discordUserId,
          tool: request.tool,
          channelId: Option.getOrNull(request.channelId),
        }),
    },
  );

const scoped = (
  request: ToolRequest,
  withinScope: (scope: GuildScope) => Effect.Effect<CallToolResult>,
): Effect.Effect<CallToolResult> =>
  resolveScope(request).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeed(errorResult(SERVER_NOT_FOUND)),
        onSome: (scope) => auditSupport(request, scope).pipe(Effect.andThen(withinScope(scope))),
      }),
    ),
    Effect.orElseSucceed(() => errorResult(DISCORD_UNAVAILABLE)),
  );

type WithinScope = (scope: GuildScope) => Effect.Effect<CallToolResult>;

const withScope: {
  (withinScope: WithinScope): (request: ToolRequest) => Promise<CallToolResult>;
  (request: ToolRequest, withinScope: WithinScope): Promise<CallToolResult>;
} = Function.dual(
  DATA_FIRST_ARITY,
  (request: ToolRequest, withinScope: WithinScope): Promise<CallToolResult> =>
    runRequest(scoped(request, withinScope)),
);

export { DISCORD_UNAVAILABLE, errorResult, jsonResult, withScope };
export type { ToolRequest, WithinScope };
