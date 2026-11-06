import type { CallToolResult } from "@modelcontextprotocol/server";
import { Array, DateTime, Effect, Option, pipe, Record } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import type { StoredVoiceSession } from "#/entities/guild-message/index.server";
import type { ListVoiceSessionsInput } from "#/features/mcp/api/tool-input";
import type { ListVoiceSessionsOutput } from "#/features/mcp/api/tool-output";

import type { GuildScope } from "./scope.server";
import { spanScopeOf } from "./span-scope.server";
import { structuredResult, withScope } from "./tool-scope.server";

type SessionView = (typeof ListVoiceSessionsOutput.Type)["sessions"][number];

type VoiceRequest = Readonly<{ scope: GuildScope; input: typeof ListVoiceSessionsInput.Type }>;

const momentOf = ({ at, precision }: StoredVoiceSession["joined"]): SessionView["joined"] => ({
  at: DateTime.formatIso(DateTime.makeUnsafe(at)),
  precision,
});

const sessionsOf = (request: VoiceRequest): Effect.Effect<typeof ListVoiceSessionsOutput.Type> => {
  const { scope } = request;
  const { names, lookup } = spanScopeOf(request);
  return Effect.promise(() => guildStore(scope.guild.guildId).readVoiceSessions(lookup)).pipe(
    Effect.map(({ total, sessions }) => ({
      ingest: "consented" as const,
      total,
      sessions: pipe(
        sessions,
        Array.map((session): SessionView => ({
          userId: session.userId,
          channelId: session.channelId,
          channelName: Option.getOrElse(
            Record.get(names, session.channelId),
            () => session.channelId,
          ),
          joined: momentOf(session.joined),
          left: Option.getOrNull(Option.map(Option.fromNullOr(session.left), momentOf)),
        })),
      ),
    })),
  );
};

const listVoiceSessions =
  (discordUserId: string) =>
  (input: typeof ListVoiceSessionsInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: input.serverId, discordUserId })((scope) => {
      if (scope.guild.consent !== "consented") {
        return structuredResult({
          ingest: "notConsented",
          total: 0,
          sessions: [],
        } satisfies typeof ListVoiceSessionsOutput.Type);
      }
      return sessionsOf({ scope, input }).pipe(Effect.flatMap(structuredResult));
    });

export { listVoiceSessions };
