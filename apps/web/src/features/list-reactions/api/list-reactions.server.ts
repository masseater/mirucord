import type { CallToolResult } from "@modelcontextprotocol/server";
import { Array, DateTime, Effect, Option, pipe, Schema } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import type { StoredReaction, StoredVote } from "#/entities/guild-message/index.server";
import { ConsentOutput, SpanFilter, spanLookupOf } from "#/entities/scope";
import { DISCORD_UNAVAILABLE, withScope } from "#/entities/scope/index.server";
import type { GuildScope } from "#/entities/scope/index.server";
import { liveReactionsOf } from "#/shared/discord/index.server";
import type { DiscordRequestError, LiveReactions } from "#/shared/discord/index.server";
import { errorResult, Ids, structuredResult, toolRegistration } from "#/shared/mcp";

import { keptUserIdsOf } from "./kept-users.server.ts";

const MessageRef = Schema.Struct({ channelId: Schema.String, messageId: Schema.String });

const ListReactionsInput = Schema.Struct({
  ...SpanFilter,
  message: Schema.optionalKey(
    MessageRef.annotate({
      description:
        "Also read what Discord shows on this message now, including reactions from before 2026-11",
    }),
  ),
  authorIds: Schema.optionalKey(
    Ids.annotate({ description: "Whose messages got reactions. Narrows reactions only" }),
  ),
});

const Reaction = Schema.Struct({
  messageId: Schema.String,
  channelId: Schema.String,
  userId: Schema.String,
  messageAuthorId: Schema.NullOr(Schema.String),
  emoji: Schema.String.annotate({ description: "Unicode, or name:id for a custom emoji" }),
  burst: Schema.Boolean.annotate({ description: "A super reaction" }),
  reactedAt: Schema.String,
});

const Vote = Schema.Struct({
  messageId: Schema.String,
  channelId: Schema.String,
  userId: Schema.String,
  answerId: Schema.Int,
  votedAt: Schema.String,
});

const LiveReaction = Schema.Struct({
  emoji: Schema.String,
  burst: Schema.Boolean,
  userIds: Schema.Array(Schema.String),
});

const LiveAnswer = Schema.Struct({
  answerId: Schema.Int,
  text: Schema.NullOr(Schema.String),
  userIds: Schema.Array(Schema.String),
});

const LiveMessage = Schema.Struct({
  authorId: Schema.String,
  reactions: Schema.Array(LiveReaction),
  votes: Schema.Array(LiveAnswer),
});

const ListReactionsOutput = Schema.Struct({
  ingest: ConsentOutput,
  reactionTotal: Schema.Int,
  reactions: Schema.Array(Reaction),
  voteTotal: Schema.Int,
  votes: Schema.Array(Vote),
  live: Schema.NullOr(LiveMessage).annotate({
    description:
      "Discord's current view of message: up to 100 people per emoji or answer and 20 emoji",
  }),
});

const LIST_REACTIONS_TOOL = {
  name: "list_reactions",
  title: "List reactions",
  description: "List who reacted to or voted in polls on which messages, newest first.",
  outputSchema: ListReactionsOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: ListReactionsInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

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
    return keptUserIdsOf(guildId)(everyone).pipe(
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
  Effect.all({ stored: storedOf(request), live: liveOf(request) }, { concurrency: 1 }).pipe(
    Effect.flatMap(({ stored, live }) => structuredResult({ ...stored, live } satisfies Output)),
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
        return structuredResult(NOT_CONSENTED);
      }
      return reactionsOf({ scope, input });
    });

export const registerListReactions = toolRegistration({
  ...LIST_REACTIONS_TOOL,
  handler: listReactions,
});
