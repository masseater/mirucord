import { Schema } from "effect";

const NO_CURSOR = 0;
const MAX_LIMIT = 50;

const Cursor = Schema.optionalKey(Schema.Int.check(Schema.isGreaterThan(NO_CURSOR)));
const Limit = Schema.optionalKey(
  Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_LIMIT })),
);

const ListChannelsInput = Schema.Struct({ serverId: Schema.String });
const FindMessagesInput = Schema.Struct({
  serverId: Schema.String,
  query: Schema.NonEmptyString,
  channelId: Schema.optionalKey(Schema.String),
  limit: Limit,
  before: Cursor,
});
const ReadMessagesInput = Schema.Struct({
  serverId: Schema.String,
  channelId: Schema.String,
  before: Schema.optionalKey(Schema.String),
  limit: Limit,
});

export { FindMessagesInput, ListChannelsInput, ReadMessagesInput };
