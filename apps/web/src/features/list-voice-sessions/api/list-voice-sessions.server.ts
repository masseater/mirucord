import type { CallToolResult } from "@modelcontextprotocol/server";
import { Array, DateTime, Effect, Option, pipe, Record, Schema } from "effect";

import { guildStore, PRECISIONS } from "#/entities/guild-message/index.server";
import type { StoredVoiceSession } from "#/entities/guild-message/index.server";
import { ConsentOutput, SpanFilter } from "#/entities/scope";
import { spanScopeOf, withScope } from "#/entities/scope/index.server";
import type { GuildScope } from "#/entities/scope/index.server";
import {
  BAD_CURSOR,
  errorResult,
  hasBadCursor,
  nextCursorOf,
  structuredResult,
  toolRegistration,
} from "#/shared/mcp";

const ListVoiceSessionsInput = Schema.Struct(SpanFilter);

const VoiceMoment = Schema.Struct({
  at: Schema.String,
  precision: Schema.Literals(PRECISIONS).annotate({
    description: "noLaterThan: learned after reconnecting, so the real time is at or before at",
  }),
});

const VoiceSession = Schema.Struct({
  userId: Schema.String,
  channelId: Schema.String,
  channelName: Schema.String,
  joined: VoiceMoment,
  left: Schema.NullOr(VoiceMoment).annotate({ description: "null while still there" }),
});

const ListVoiceSessionsOutput = Schema.Struct({
  ingest: ConsentOutput,
  total: Schema.Int,
  nextCursor: Schema.optionalKey(
    Schema.String.annotate({
      description: "Pass it as cursor to read the next page. Absent on the last page",
    }),
  ),
  sessions: Schema.Array(VoiceSession).annotate({
    description:
      "One person's stay in one channel. Overlapping sessions in a channel mean those people were in the call together. Nothing before 2026-11",
  }),
});

const LIST_VOICE_SESSIONS_TOOL = {
  name: "list_voice_sessions",
  title: "List voice sessions",
  description: "List who was in which voice or stage channel and when, newest join first.",
  outputSchema: ListVoiceSessionsOutput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
  inputSchema: ListVoiceSessionsInput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
};

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
      ...Option.match(nextCursorOf({ offset: lookup.offset, shown: sessions.length, total }), {
        onNone: () => ({}),
        onSome: (nextCursor) => ({ nextCursor }),
      }),
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
      if (hasBadCursor(input.cursor)) {
        return Effect.succeed(errorResult(BAD_CURSOR));
      }
      if (scope.guild.consent !== "consented") {
        return structuredResult({
          ingest: "notConsented",
          total: 0,
          sessions: [],
        } satisfies typeof ListVoiceSessionsOutput.Type);
      }
      return sessionsOf({ scope, input }).pipe(Effect.flatMap(structuredResult));
    });

export const registerListVoiceSessions = toolRegistration({
  ...LIST_VOICE_SESSIONS_TOOL,
  handler: listVoiceSessions,
});
