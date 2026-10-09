import type { CallToolResult } from "@modelcontextprotocol/server";
import { Effect, Option, Schema } from "effect";

import type { GuildScope } from "./scope.server";
import { grantSupport, revokeSupport, supportHistory } from "./support.server";
import { errorResult, jsonResult, withScope } from "./tool-scope.server";
import type { ToolRequest } from "./tool-scope.server";

const MANAGERS_ONLY = "Only the server owner or members with Manage Server can do this";
const MAX_SUPPORT_HOURS = 72;

const ServerInput = Schema.Struct({ serverId: Schema.String });
const GrantSupportInput = Schema.Struct({
  serverId: Schema.String,
  hours: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_SUPPORT_HOURS })),
});

const asManager = (
  request: Omit<ToolRequest, "channelId">,
  withinScope: (scope: GuildScope) => Effect.Effect<CallToolResult>,
): Promise<CallToolResult> =>
  withScope({ ...request, channelId: Option.none() }, (scope) =>
    Option.match(
      Option.liftPredicate(scope, ({ access }) => access === "manager"),
      {
        onNone: () => Effect.succeed(errorResult(MANAGERS_ONLY)),
        onSome: withinScope,
      },
    ),
  );
const grantSupportAccess =
  (discordUserId: string) =>
  ({ serverId, hours }: typeof GrantSupportInput.Type): Promise<CallToolResult> =>
    asManager({ tool: "grant_support_access", guildId: serverId, discordUserId }, () =>
      grantSupport({ guildId: serverId, grantedBy: discordUserId, hours }).pipe(
        Effect.map((expiresAt) => jsonResult({ expiresAt: expiresAt.toISOString() })),
      ),
    );

const revokeSupportAccess =
  (discordUserId: string) =>
  ({ serverId }: typeof ServerInput.Type): Promise<CallToolResult> =>
    asManager({ tool: "revoke_support_access", guildId: serverId, discordUserId }, () =>
      revokeSupport(serverId).pipe(Effect.as(jsonResult({ revoked: true }))),
    );

const listSupportAccess =
  (discordUserId: string) =>
  ({ serverId }: typeof ServerInput.Type): Promise<CallToolResult> =>
    asManager({ tool: "list_support_access", guildId: serverId, discordUserId }, () =>
      supportHistory(serverId).pipe(Effect.map(jsonResult)),
    );

const toolInput = Schema.toStandardSchemaV1;

const grantSupportTool = {
  description:
    "Let mirucord support read this server for a limited number of hours. Server managers only.",
  inputSchema: Schema.toStandardJSONSchemaV1(toolInput(GrantSupportInput)),
};

const revokeSupportTool = {
  description: "End mirucord support access to this server now. Server managers only.",
  inputSchema: Schema.toStandardJSONSchemaV1(toolInput(ServerInput)),
};

const listSupportTool = {
  description:
    "Show when support access was granted and every read support made. Server managers only.",
  inputSchema: Schema.toStandardJSONSchemaV1(toolInput(ServerInput)),
};

export {
  grantSupportAccess,
  grantSupportTool,
  listSupportAccess,
  listSupportTool,
  revokeSupportAccess,
  revokeSupportTool,
};
