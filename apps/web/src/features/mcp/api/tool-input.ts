import { DateTime, Option, Schema } from "effect";

export const FIRST_OFFSET = 0;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const MAX_MEMBER_LIMIT = 200;
const DEFAULT_MEMBER_LIMIT = 100;
const MAX_MEMBER_IDS = 100;

export const limitOf = (limit: number | undefined): number =>
  Option.getOrElse(Option.fromUndefinedOr(limit), () => DEFAULT_LIMIT);

const Offset = Schema.optionalKey(Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST_OFFSET)));
const Limit = Schema.optionalKey(
  Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_LIMIT })),
);

export const ListChannelsInput = Schema.Struct({ serverId: Schema.String });
export const FindMessagesInput = Schema.Struct({
  serverId: Schema.String,
  query: Schema.NonEmptyString,
  channelId: Schema.optionalKey(Schema.String),
  limit: Limit,
  offset: Offset,
});
export const FindSimilarMessagesInput = Schema.Struct({
  serverId: Schema.String,
  query: Schema.NonEmptyString,
  channelId: Schema.optionalKey(Schema.String),
  limit: Limit,
});
export const ReadMessagesInput = Schema.Struct({
  serverId: Schema.String,
  channelId: Schema.optionalKey(Schema.String),
  authorId: Schema.optionalKey(Schema.String),
  before: Schema.optionalKey(Schema.String),
  limit: Limit,
});

const Ids = Schema.Array(Schema.String).check(Schema.isMaxLength(MAX_MEMBER_IDS));
const MemberLimit = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_MEMBER_LIMIT }));

export const ListMembersInput = Schema.Struct({
  serverId: Schema.String,
  userIds: Schema.optionalKey(Ids),
  query: Schema.optionalKey(Schema.NonEmptyString),
  includeLeft: Schema.optionalKey(Schema.Boolean),
  limit: Schema.optionalKey(MemberLimit),
  offset: Offset,
});

const SpanFilter = {
  serverId: Schema.String,
  userIds: Schema.optionalKey(Ids),
  channelIds: Schema.optionalKey(Ids),
  since: Schema.optionalKey(Schema.DateTimeUtcFromString),
  until: Schema.optionalKey(Schema.DateTimeUtcFromString),
  limit: Schema.optionalKey(MemberLimit),
  offset: Offset,
};

export const ListVoiceSessionsInput = Schema.Struct(SpanFilter);

const MessageRef = Schema.Struct({ channelId: Schema.String, messageId: Schema.String });

export const ListReactionsInput = Schema.Struct({
  ...SpanFilter,
  message: Schema.optionalKey(MessageRef),
  authorIds: Schema.optionalKey(Ids),
});

export const ListLinkedAccountsInput = Schema.Struct({
  serverId: Schema.String,
  userIds: Ids,
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
