import { DateTime, Option, Schema } from "effect";

const FIRST_OFFSET = 0;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const MAX_MEMBER_LIMIT = 200;
const DEFAULT_MEMBER_LIMIT = 100;
const MAX_MEMBER_IDS = 100;

const limitOf = (limit: number | undefined): number =>
  Option.getOrElse(Option.fromUndefinedOr(limit), () => DEFAULT_LIMIT);

const Offset = Schema.optionalKey(Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST_OFFSET)));
const Limit = Schema.optionalKey(
  Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_LIMIT })),
);

const ListChannelsInput = Schema.Struct({ serverId: Schema.String });
const FindMessagesInput = Schema.Struct({
  serverId: Schema.String,
  query: Schema.NonEmptyString,
  channelId: Schema.optionalKey(Schema.String),
  limit: Limit,
  offset: Offset,
});
const FindSimilarMessagesInput = Schema.Struct({
  serverId: Schema.String,
  query: Schema.NonEmptyString,
  channelId: Schema.optionalKey(Schema.String),
  limit: Limit,
});
const ReadMessagesInput = Schema.Struct({
  serverId: Schema.String,
  channelId: Schema.optionalKey(Schema.String),
  authorId: Schema.optionalKey(Schema.String),
  before: Schema.optionalKey(Schema.String),
  limit: Limit,
});

const Ids = Schema.Array(Schema.String).check(Schema.isMaxLength(MAX_MEMBER_IDS));
const MemberLimit = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_MEMBER_LIMIT }));

const ListMembersInput = Schema.Struct({
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

const ListVoiceSessionsInput = Schema.Struct(SpanFilter);

const MessageRef = Schema.Struct({ channelId: Schema.String, messageId: Schema.String });

const ListReactionsInput = Schema.Struct({
  ...SpanFilter,
  message: Schema.optionalKey(MessageRef),
  authorIds: Schema.optionalKey(Ids),
});

const ListScheduledEventsInput = Schema.Struct({
  ...SpanFilter,
  eventId: Schema.optionalKey(Schema.String),
});

const ListThreadMembersInput = Schema.Struct({
  serverId: Schema.String,
  threadId: Schema.optionalKey(Schema.String),
  userIds: Schema.optionalKey(Ids),
  includeLeft: Schema.optionalKey(Schema.Boolean),
  limit: Schema.optionalKey(MemberLimit),
  offset: Offset,
});

const ListAuditLogInput = Schema.Struct({
  serverId: Schema.String,
  userIds: Schema.optionalKey(Ids),
  actions: Schema.optionalKey(Ids),
  since: Schema.optionalKey(Schema.DateTimeUtcFromString),
  until: Schema.optionalKey(Schema.DateTimeUtcFromString),
  limit: Schema.optionalKey(MemberLimit),
  offset: Offset,
});

const ListLinkedAccountsInput = Schema.Struct({
  serverId: Schema.String,
  userIds: Ids,
});

const memberLimitOf = (limit: number | undefined): number =>
  Option.getOrElse(Option.fromUndefinedOr(limit), () => DEFAULT_MEMBER_LIMIT);

type SpanInput = Pick<
  typeof ListVoiceSessionsInput.Type,
  "userIds" | "since" | "until" | "limit" | "offset"
>;

type SpanLookup = Readonly<{
  userIds: readonly string[] | null;
  since: number | null;
  until: number | null;
  limit: number;
  offset: number;
}>;

const millisOf = (at: DateTime.Utc | undefined): number | null =>
  Option.getOrNull(Option.map(Option.fromUndefinedOr(at), DateTime.toEpochMillis));

const spanLookupOf = (input: SpanInput): SpanLookup => ({
  userIds: Option.getOrNull(Option.fromUndefinedOr(input.userIds)),
  since: millisOf(input.since),
  until: millisOf(input.until),
  limit: memberLimitOf(input.limit),
  offset: Option.getOrElse(Option.fromUndefinedOr(input.offset), () => FIRST_OFFSET),
});

export {
  FindMessagesInput,
  FindSimilarMessagesInput,
  FIRST_OFFSET,
  limitOf,
  ListAuditLogInput,
  ListChannelsInput,
  ListLinkedAccountsInput,
  ListMembersInput,
  ListReactionsInput,
  ListScheduledEventsInput,
  ListThreadMembersInput,
  ListVoiceSessionsInput,
  memberLimitOf,
  ReadMessagesInput,
  spanLookupOf,
};
export type { SpanInput, SpanLookup };
