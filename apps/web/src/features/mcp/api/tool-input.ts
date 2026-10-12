import { Schema } from "effect";

const FIRST_OFFSET = 0;
const MAX_LIMIT = 50;

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
  channelId: Schema.String,
  before: Schema.optionalKey(Schema.String),
  limit: Limit,
});

export {
  FindMessagesInput,
  FindSimilarMessagesInput,
  FIRST_OFFSET,
  ListChannelsInput,
  ReadMessagesInput,
};
