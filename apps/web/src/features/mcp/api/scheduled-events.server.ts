import type { CallToolResult } from "@modelcontextprotocol/server";
import { Array, Effect, Option, pipe } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import type { ListScheduledEventsInput } from "#/features/mcp/api/tool-input";
import type { ListScheduledEventsOutput } from "#/features/mcp/api/tool-output";

import { liveInterestedKeptOf } from "./kept-users.server";
import type { DiscordRequestError } from "./kept-users.server";
import { viewOf } from "./scheduled-event-view";
import type { GuildScope } from "./scope.server";
import { spanScopeOf } from "./span-scope.server";
import { DISCORD_UNAVAILABLE, errorResult, structuredResult, withScope } from "./tool-scope.server";

type Output = typeof ListScheduledEventsOutput.Type;

type Input = typeof ListScheduledEventsInput.Type;

type EventRequest = Readonly<{ scope: GuildScope; input: Input }>;

const NO_LIVE: Output["liveInterestedUserIds"] = Option.getOrNull(Option.none());

const NOT_CONSENTED: Output = {
  ingest: "notConsented",
  total: 0,
  events: [],
  liveInterestedUserIds: NO_LIVE,
};

const storedOf = (request: EventRequest): Effect.Effect<Omit<Output, "liveInterestedUserIds">> => {
  const { scope, input } = request;
  const { names, lookup: span } = spanScopeOf(request);
  const lookup = { ...span, eventId: Option.getOrNull(Option.fromUndefinedOr(input.eventId)) };
  return Effect.promise(() => guildStore(scope.guild.guildId).readScheduledEvents(lookup)).pipe(
    Effect.map(({ total, events }) => ({
      ingest: "consented" as const,
      total,
      events: pipe(events, Array.map(viewOf(names))),
    })),
  );
};

type Stored = Omit<Output, "liveInterestedUserIds">;

const withLive =
  (request: EventRequest) =>
  (stored: Stored): Effect.Effect<Output, DiscordRequestError> => {
    if (Option.isNone(Option.fromUndefinedOr(request.input.eventId))) {
      return Effect.succeed({ ...stored, liveInterestedUserIds: NO_LIVE });
    }
    return liveInterestedKeptOf(request.scope.guild.guildId)(stored.events).pipe(
      Effect.map((live) => ({ ...stored, liveInterestedUserIds: live })),
    );
  };

const eventsOf = (request: EventRequest): Effect.Effect<CallToolResult> =>
  storedOf(request).pipe(
    Effect.flatMap(withLive(request)),
    Effect.map(structuredResult),
    Effect.orElseSucceed(() => errorResult(DISCORD_UNAVAILABLE)),
  );

const listScheduledEvents =
  (discordUserId: string) =>
  (input: typeof ListScheduledEventsInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: input.serverId, discordUserId })((scope) => {
      if (scope.guild.consent !== "consented") {
        return Effect.succeed(structuredResult(NOT_CONSENTED));
      }
      return eventsOf({ scope, input });
    });

export { listScheduledEvents };
