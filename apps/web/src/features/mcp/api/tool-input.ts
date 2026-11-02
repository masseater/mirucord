import { Option, Schema } from "effect";

const FIRST_OFFSET = 0;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

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

export {
  FindMessagesInput,
  FindSimilarMessagesInput,
  FIRST_OFFSET,
  limitOf,
  ListChannelsInput,
  ReadMessagesInput,
};
