import type { GatewayJob, ReactionChange, ReactionsJob } from "@repo/ingest-util-gateway-contract";
import { DiscordEmojiSchema as Emoji, emojiKeyOf } from "@repo/shared-util-discord";
import { Discord } from "dfx";
import { Array, Match, Option, Schema } from "effect";

import { mergeByGuild } from "./guild-batch";

const Target = {
  guild_id: Schema.optional(Schema.String),
  channel_id: Schema.String,
  message_id: Schema.String,
};

const ReactionEvent = Schema.Struct({
  ...Target,
  user_id: Schema.String,
  message_author_id: Schema.optional(Schema.String),
  emoji: Emoji,
  burst: Schema.optional(Schema.Boolean),
});

const ClearEvent = Schema.Struct({ ...Target, emoji: Schema.optional(Emoji) });

const VoteEvent = Schema.Struct({ ...Target, user_id: Schema.String, answer_id: Schema.Int });

const decodeReaction = Schema.decodeOption(ReactionEvent);
const decodeClear = Schema.decodeOption(ClearEvent);
const decodeVote = Schema.decodeOption(VoteEvent);

type Targeted = Readonly<{
  guild_id?: string | undefined;
  channel_id: string;
  message_id: string;
}>;

const jobOf =
  (now: number) =>
  (
    target: Targeted,
    change: (
      base: Readonly<{ channelId: string; messageId: string; at: number }>,
    ) => ReactionChange,
  ): Option.Option<GatewayJob> =>
    Option.fromUndefinedOr(target.guild_id).pipe(
      Option.map((guildId): GatewayJob => ({
        kind: "reactions",
        guildId,
        changes: [change({ channelId: target.channel_id, messageId: target.message_id, at: now })],
      })),
    );

const reactionChangeOf = (
  data: typeof ReactionEvent.Encoded,
  now: number,
  kind: "add" | "remove",
): Option.Option<GatewayJob> =>
  decodeReaction(data).pipe(
    Option.flatMap((event) =>
      jobOf(now)(event, (base): ReactionChange => {
        const emoji = emojiKeyOf(event.emoji);
        const burst = event.burst === true;
        if (kind === "remove") {
          return { kind, ...base, userId: event.user_id, emoji, burst };
        }
        const author = Option.getOrNull(Option.fromUndefinedOr(event.message_author_id));
        return { kind, ...base, userId: event.user_id, messageAuthorId: author, emoji, burst };
      }),
    ),
  );

const clearChangeOf = (data: typeof ClearEvent.Encoded, now: number): Option.Option<GatewayJob> =>
  decodeClear(data).pipe(
    Option.flatMap((event) =>
      jobOf(now)(event, (base) => ({
        kind: "clear",
        ...base,
        emoji: Option.getOrNull(Option.map(Option.fromUndefinedOr(event.emoji), emojiKeyOf)),
      })),
    ),
  );

const voteChangeOf = (
  data: typeof VoteEvent.Encoded,
  now: number,
  kind: "vote" | "unvote",
): Option.Option<GatewayJob> =>
  decodeVote(data).pipe(
    Option.flatMap((event) =>
      jobOf(now)(event, (base) => ({
        kind,
        ...base,
        userId: event.user_id,
        answerId: event.answer_id,
      })),
    ),
  );

const reactionJobOf = Match.type<Discord.GatewayDispatchPayload>().pipe(
  Match.discriminator("t")(
    Discord.GatewayDispatchEvents.MessageReactionAdd,
    (dispatch) =>
      (now: number): Option.Option<GatewayJob> =>
        reactionChangeOf(dispatch.d, now, "add"),
  ),
  Match.discriminator("t")(
    Discord.GatewayDispatchEvents.MessageReactionRemove,
    (dispatch) =>
      (now: number): Option.Option<GatewayJob> =>
        reactionChangeOf(dispatch.d, now, "remove"),
  ),
  Match.discriminator("t")(
    Discord.GatewayDispatchEvents.MessageReactionRemoveAll,
    Discord.GatewayDispatchEvents.MessageReactionRemoveEmoji,
    (dispatch) =>
      (now: number): Option.Option<GatewayJob> =>
        clearChangeOf(dispatch.d, now),
  ),
  Match.discriminator("t")(
    Discord.GatewayDispatchEvents.MessagePollVoteAdd,
    (dispatch) =>
      (now: number): Option.Option<GatewayJob> =>
        voteChangeOf(dispatch.d, now, "vote"),
  ),
  Match.discriminator("t")(
    Discord.GatewayDispatchEvents.MessagePollVoteRemove,
    (dispatch) =>
      (now: number): Option.Option<GatewayJob> =>
        voteChangeOf(dispatch.d, now, "unvote"),
  ),
  Match.orElse(() => (): Option.Option<GatewayJob> => Option.none()),
);

const reactionJobKeyOf = (job: ReactionsJob): string => {
  const { messageId, at } = Array.headNonEmpty(job.changes);
  return `${job.guildId}-${messageId}-${at}`;
};

const isReactionsJob = (job: GatewayJob): job is ReactionsJob => job.kind === "reactions";

const mergeReactionJobs = mergeByGuild({
  isBatch: isReactionsJob,
  rebuild: (guildId, changes): GatewayJob => ({ kind: "reactions", guildId, changes }),
});

export { mergeReactionJobs, reactionJobKeyOf, reactionJobOf };
