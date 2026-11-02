import type { CallToolResult } from "@modelcontextprotocol/server";
import { Array, DateTime, Effect, pipe } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import type { StoredInviteJoin } from "#/entities/guild-message/index.server";
import { spanLookupOf } from "#/features/mcp/api/tool-input";
import type { ListMemberInvitesInput } from "#/features/mcp/api/tool-input";
import type { ListMemberInvitesOutput } from "#/features/mcp/api/tool-output";

import { errorResult, structuredResult, withScope } from "./tool-scope.server";

type Output = typeof ListMemberInvitesOutput.Type;

const NOT_MANAGER =
  "You need the Manage Server permission in this server to see which invites people joined through";

const NOT_CONSENTED: Output = { ingest: "notConsented", total: 0, joins: [] };

const viewOf = (join: StoredInviteJoin): Output["joins"][number] => ({
  userId: join.userId,
  joinedAt: DateTime.formatIso(DateTime.makeUnsafe(join.joinedAt)),
  precision: join.precision,
  invites: [...join.candidates],
});

const joinsOf = (
  guildId: string,
  input: typeof ListMemberInvitesInput.Type,
): Effect.Effect<Output> =>
  Effect.promise(() => guildStore(guildId).readInviteJoins(spanLookupOf(input))).pipe(
    Effect.map(({ total, joins }) => ({
      ingest: "consented" as const,
      total,
      joins: pipe(joins, Array.map(viewOf)),
    })),
  );

const listMemberInvites =
  (discordUserId: string) =>
  (input: typeof ListMemberInvitesInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: input.serverId, discordUserId })((scope) => {
      if (!scope.managesGuild) {
        return Effect.succeed(errorResult(NOT_MANAGER));
      }
      if (scope.guild.consent !== "consented") {
        return Effect.succeed(structuredResult(NOT_CONSENTED));
      }
      return joinsOf(scope.guild.guildId, input).pipe(Effect.map(structuredResult));
    });

export { listMemberInvites };
