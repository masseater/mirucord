import { DiscordEmojiSchema, emojiKeyOf } from "@repo/shared-util-discord";
import { Discord } from "dfx";
import { Array, Effect, Match, Option, pipe, Schema } from "effect";

import { decodeBody, withDiscord } from "./client.server";
import type { DiscordRequestError } from "./client.server";
import { NOT_FOUND } from "./discord.server";

const USERS_PER_PAGE = 100;
const MAX_EMOJIS = 20;
const NO_REACTIONS = 0;

const CountDetails = Schema.Struct({ burst: Schema.Finite, normal: Schema.Finite });

const Reaction = Schema.Struct({ emoji: DiscordEmojiSchema, count_details: CountDetails });

const PollMedia = Schema.Struct({ text: Schema.optional(Schema.String) });

const PollAnswer = Schema.Struct({ answer_id: Schema.Int, poll_media: PollMedia });

const Poll = Schema.Struct({ answers: Schema.Array(PollAnswer) });

const MessageReactions = Schema.Struct({
  author: Schema.Struct({ id: Schema.String }),
  reactions: Schema.optional(Schema.Array(Reaction)),
  poll: Schema.optional(Poll),
});

const Users = Schema.Array(Schema.Struct({ id: Schema.String }));

const Voters = Schema.Struct({ users: Users });

const decodeMessage = decodeBody(MessageReactions);
const decodeUsers = decodeBody(Users);
const decodeVoters = decodeBody(Voters);

type ReactedEmoji = Readonly<{ emoji: string; burst: boolean; userIds: readonly string[] }>;

type AnswerVoters = Readonly<{ answerId: number; text: string | null; userIds: readonly string[] }>;

type LiveReactions = Readonly<{
  authorId: string;
  reactions: readonly ReactedEmoji[];
  votes: readonly AnswerVoters[];
}>;

type MessageRef = Readonly<{ channelId: string; messageId: string }>;

const reactionTypeOf = Match.type<boolean>().pipe(
  Match.when(true, () => Discord.ReactionTypes.BURST),
  Match.orElse(() => Discord.ReactionTypes.NORMAL),
);

const idsOf = (users: readonly Readonly<{ id: string }>[]): readonly string[] =>
  pipe(
    users,
    Array.map(({ id }) => id),
  );

const reactorsOf = (
  { channelId, messageId }: MessageRef,
  { emoji, burst }: Readonly<{ emoji: string; burst: boolean }>,
): Effect.Effect<ReactedEmoji, DiscordRequestError> =>
  withDiscord((rest) =>
    rest
      .listMessageReactionsByEmoji(channelId, messageId, encodeURIComponent(emoji), {
        type: reactionTypeOf(burst),
        limit: USERS_PER_PAGE,
      })
      .pipe(Effect.flatMap(decodeUsers)),
  ).pipe(Effect.map((users) => ({ emoji, burst, userIds: idsOf(users) })));

const votersOf = (
  { channelId, messageId }: MessageRef,
  { answerId, text }: Omit<AnswerVoters, "userIds">,
): Effect.Effect<AnswerVoters, DiscordRequestError> =>
  withDiscord((rest) =>
    rest
      .getAnswerVoters(channelId, messageId, String(answerId), { limit: USERS_PER_PAGE })
      .pipe(Effect.flatMap(decodeVoters)),
  ).pipe(Effect.map(({ users }) => ({ answerId, text, userIds: idsOf(users) })));

type Reacted = Readonly<{ emoji: string; burst: boolean }>;

const reactedOf = (found: typeof MessageReactions.Type): readonly Reacted[] =>
  pipe(
    Option.getOrElse(Option.fromUndefinedOr(found.reactions), () => []),
    Array.flatMap(({ emoji, count_details }) => {
      const key = emojiKeyOf(emoji);
      return [
        ...Option.toArray(
          Option.liftPredicate(
            { emoji: key, burst: false },
            () => count_details.normal > NO_REACTIONS,
          ),
        ),
        ...Option.toArray(
          Option.liftPredicate(
            { emoji: key, burst: true },
            () => count_details.burst > NO_REACTIONS,
          ),
        ),
      ];
    }),
    Array.take(MAX_EMOJIS),
  );

const answersOf = (found: typeof MessageReactions.Type): readonly Omit<AnswerVoters, "userIds">[] =>
  pipe(
    Option.fromUndefinedOr(found.poll),
    Option.map(({ answers }) =>
      pipe(
        answers,
        Array.map(({ answer_id, poll_media }) => ({
          answerId: answer_id,
          text: Option.getOrNull(Option.fromUndefinedOr(poll_media.text)),
        })),
      ),
    ),
    Option.getOrElse(() => []),
  );

const liveReactionsOf = (
  ref: MessageRef,
): Effect.Effect<Option.Option<LiveReactions>, DiscordRequestError> =>
  withDiscord((rest) =>
    rest.getMessage(ref.channelId, ref.messageId).pipe(Effect.flatMap(decodeMessage)),
  ).pipe(
    Effect.flatMap((found) =>
      Effect.all({
        reactions: Effect.forEach(reactedOf(found), (reacted) => reactorsOf(ref, reacted)),
        votes: Effect.forEach(answersOf(found), (answer) => votersOf(ref, answer)),
      }).pipe(Effect.map((live) => Option.some({ authorId: found.author.id, ...live }))),
    ),
    Effect.catchIf(
      (error) => Option.contains(error.status, NOT_FOUND),
      () => Effect.succeedNone,
    ),
    Effect.withSpan("liveReactions", { attributes: { ...ref } }),
  );

export { liveReactionsOf };
export type { AnswerVoters, LiveReactions, MessageRef, ReactedEmoji };
