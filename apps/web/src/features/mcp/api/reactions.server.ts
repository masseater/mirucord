import type { CallToolResult } from "@modelcontextprotocol/server";
import { Array, DateTime, Effect, Option, pipe } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import type { StoredReaction, StoredVote } from "#/entities/guild-message/index.server";
import type { ListReactionsInput } from "#/features/mcp/api/tool-input";
import { spanLookupOf } from "#/features/mcp/api/tool-input";
import type { ListReactionsOutput } from "#/features/mcp/api/tool-output";
import { liveReactionsOf } from "#/shared/discord/index.server";
import type { DiscordRequestError, LiveReactions } from "#/shared/discord/index.server";

import type { GuildScope } from "./scope.server";
import { DISCORD_UNAVAILABLE, errorResult, structuredResult, withScope } from "./tool-scope.server";

const CHANNEL_NOT_FOUND = "Channel not found";

type Output = typeof ListReactionsOutput.Type;

type Input = typeof ListReactionsInput.Type;

type ReactionRequest = Readonly<{ scope: GuildScope; input: Input }>;

const NOT_CONSENTED: Output = {
  ingest: "notConsented",
  reactionTotal: 0,
  reactions: [],
  voteTotal: 0,
  votes: [],
  live: Option.getOrNull(Option.none()),
};

const isoOf = (at: number): string => DateTime.formatIso(DateTime.makeUnsafe(at));

const channelsOf = ({ scope, input }: ReactionRequest): readonly string[] => {
  const wanted = pipe(
    Option.fromUndefinedOr(input.channelIds),
    Option.map((ids) => Array.intersection(scope.visible, ids)),
    Option.getOrElse(() => scope.visible),
  );
  return Option.match(Option.fromUndefinedOr(input.message), {
    onNone: () => wanted,
    onSome: ({ channelId }) => Array.intersection(wanted, [channelId]),
  });
};

const reactionView = ({ reactedAt, ...row }: StoredReaction): Output["reactions"][number] => ({
  ...row,
  reactedAt: isoOf(reactedAt),
});

const voteView = ({ votedAt, ...row }: StoredVote): Output["votes"][number] => ({
  ...row,
  votedAt: isoOf(votedAt),
});

const storedOf = (request: ReactionRequest): Effect.Effect<Omit<Output, "live">> => {
  const { scope, input } = request;
  const lookup = {
    channelIds: channelsOf(request),
    messageId: Option.getOrNull(
      Option.map(Option.fromUndefinedOr(input.message), ({ messageId }) => messageId),
    ),
    ...spanLookupOf(input),
    authorIds: Option.getOrNull(Option.fromUndefinedOr(input.authorIds)),
  };
  return Effect.promise(() => guildStore(scope.guild.guildId).readReactions(lookup)).pipe(
    Effect.map((page) => ({
      ingest: "consented" as const,
      reactionTotal: page.reactionTotal,
      reactions: pipe(page.reactions, Array.map(reactionView)),
      voteTotal: page.voteTotal,
      votes: pipe(page.votes, Array.map(voteView)),
    })),
  );
};

const withoutErased =
  (guildId: string) =>
  (live: LiveReactions): Effect.Effect<LiveReactions> => {
    const everyone = pipe(
      [...live.reactions, ...live.votes],
      Array.flatMap(({ userIds }) => userIds),
      Array.dedupe,
    );
    return Effect.promise(() => guildStore(guildId).keptUserIds(everyone)).pipe(
      Effect.map((kept) => ({
        authorId: live.authorId,
        reactions: pipe(
          live.reactions,
          Array.map(({ emoji, burst, userIds }) => ({
            emoji,
            burst,
            userIds: Array.intersection(userIds, kept),
          })),
        ),
        votes: pipe(
          live.votes,
          Array.map(({ answerId, text, userIds }) => ({
            answerId,
            text,
            userIds: Array.intersection(userIds, kept),
          })),
        ),
      })),
    );
  };

const NO_LIVE: Output["live"] = Option.getOrNull(Option.none());

const liveOf = ({
  scope,
  input,
}: ReactionRequest): Effect.Effect<Output["live"], DiscordRequestError> => {
  const kept = withoutErased(scope.guild.guildId);
  const filtered = Option.match({
    onNone: (): Effect.Effect<Output["live"]> => Effect.succeed(NO_LIVE),
    onSome: kept,
  });
  return Option.match(Option.fromUndefinedOr(input.message), {
    onNone: () => Effect.succeed(NO_LIVE),
    onSome: (message) => liveReactionsOf(message).pipe(Effect.flatMap(filtered)),
  });
};

const reactionsOf = (request: ReactionRequest): Effect.Effect<CallToolResult> =>
  Effect.all({ stored: storedOf(request), live: liveOf(request) }).pipe(
    Effect.map(({ stored, live }) => structuredResult({ ...stored, live } satisfies Output)),
    Effect.orElseSucceed(() => errorResult(DISCORD_UNAVAILABLE)),
  );

const isHidden = ({ scope, input }: ReactionRequest): boolean =>
  Option.exists(
    Option.fromUndefinedOr(input.message),
    ({ channelId }) => !scope.visible.includes(channelId),
  );

const listReactions =
  (discordUserId: string) =>
  (input: typeof ListReactionsInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: input.serverId, discordUserId })((scope) => {
      if (isHidden({ scope, input })) {
        return Effect.succeed(errorResult(CHANNEL_NOT_FOUND));
      }
      if (scope.guild.consent !== "consented") {
        return Effect.succeed(structuredResult(NOT_CONSENTED));
      }
      return reactionsOf({ scope, input });
    });

export { listReactions };
