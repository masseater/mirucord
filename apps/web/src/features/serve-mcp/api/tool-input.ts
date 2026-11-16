import { DateTime, Option, Schema } from "effect";

export const FIRST_OFFSET = 0;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const MAX_MEMBER_LIMIT = 200;
const DEFAULT_MEMBER_LIMIT = 100;
const MAX_MEMBER_IDS = 100;

export const limitOf = (limit: number | undefined): number =>
  Option.getOrElse(Option.fromUndefinedOr(limit), () => DEFAULT_LIMIT);

const Offset = Schema.optionalKey(
  Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST_OFFSET)).annotate({
    description: "Advance by limit to read the next page",
  }),
);
const Limit = Schema.optionalKey(
  Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_LIMIT })).annotate({
    description: `Default ${DEFAULT_LIMIT}`,
  }),
);

export const ListChannelsInput = Schema.Struct({ serverId: Schema.String });
export const FindMessagesInput = Schema.Struct({
  serverId: Schema.String,
  query: Schema.NonEmptyString.annotate({
    description:
      "Matched literally, ignoring case, in text, image descriptions, embeds, stickers and polls. Try other wordings yourself",
  }),
  channelId: Schema.optionalKey(Schema.String),
  limit: Limit,
  offset: Offset,
});
export const FindSimilarMessagesInput = Schema.Struct({
  serverId: Schema.String,
  query: Schema.NonEmptyString.annotate({
    description: "A sentence or a few words describing what you look for",
  }),
  channelId: Schema.optionalKey(Schema.String),
  limit: Limit,
});
export const ReadMessagesInput = Schema.Struct({
  serverId: Schema.String,
  channelId: Schema.optionalKey(
    Schema.String.annotate({ description: "With authorId, this channel and its threads" }),
  ),
  authorId: Schema.optionalKey(
    Schema.String.annotate({
      description: "Messages by this person in every channel you can read",
    }),
  ),
  before: Schema.optionalKey(
    Schema.String.annotate({ description: "The oldest returned id, to read further back" }),
  ),
  limit: Limit,
});

const Ids = Schema.Array(Schema.String).check(Schema.isMaxLength(MAX_MEMBER_IDS));
const MemberLimit = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_MEMBER_LIMIT }));

export const ListMembersInput = Schema.Struct({
  serverId: Schema.String,
  userIds: Schema.optionalKey(
    Ids.annotate({
      description:
        "From a message's authorId or mentions. Includes people who left unless includeLeft is false",
    }),
  ),
  query: Schema.optionalKey(
    Schema.NonEmptyString.annotate({
      description: "Matches the user name, display name or nickname, ignoring case",
    }),
  ),
  includeLeft: Schema.optionalKey(Schema.Boolean),
  limit: Schema.optionalKey(MemberLimit),
  offset: Offset,
});

const SpanFilter = {
  serverId: Schema.String,
  userIds: Schema.optionalKey(Ids),
  channelIds: Schema.optionalKey(Ids),
  since: Schema.optionalKey(Schema.DateTimeUtcFromString.annotate({ description: "ISO 8601" })),
  until: Schema.optionalKey(Schema.DateTimeUtcFromString.annotate({ description: "ISO 8601" })),
  limit: Schema.optionalKey(MemberLimit),
  offset: Offset,
};

export const ListVoiceSessionsInput = Schema.Struct(SpanFilter);

const MessageRef = Schema.Struct({ channelId: Schema.String, messageId: Schema.String });

export const ListReactionsInput = Schema.Struct({
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

export const ListLinkedAccountsInput = Schema.Struct({
  serverId: Schema.String,
  userIds: Ids.annotate({ description: "From a message's authorId or list_members" }),
});

export const memberLimitOf = (limit: number | undefined): number =>
  Option.getOrElse(Option.fromUndefinedOr(limit), () => DEFAULT_MEMBER_LIMIT);

export type SpanInput = Pick<
  typeof ListVoiceSessionsInput.Type,
  "userIds" | "since" | "until" | "limit" | "offset"
>;

export type SpanLookup = Readonly<{
  userIds: readonly string[] | null;
  since: number | null;
  until: number | null;
  limit: number;
  offset: number;
}>;

const millisOf = (at: DateTime.Utc | undefined): number | null =>
  Option.getOrNull(Option.map(Option.fromUndefinedOr(at), DateTime.toEpochMillis));

export const spanLookupOf = (input: SpanInput): SpanLookup => ({
  userIds: Option.getOrNull(Option.fromUndefinedOr(input.userIds)),
  since: millisOf(input.since),
  until: millisOf(input.until),
  limit: memberLimitOf(input.limit),
  offset: Option.getOrElse(Option.fromUndefinedOr(input.offset), () => FIRST_OFFSET),
});
