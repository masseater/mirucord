import { DateTime, Option, Schema } from "effect";

import { FIRST_OFFSET, Ids, MemberLimit, memberLimitOf, Offset } from "#/shared/mcp";

export const SpanFilter = {
  serverId: Schema.String,
  userIds: Schema.optionalKey(Ids),
  channelIds: Schema.optionalKey(Ids),
  since: Schema.optionalKey(Schema.DateTimeUtcFromString.annotate({ description: "ISO 8601" })),
  until: Schema.optionalKey(Schema.DateTimeUtcFromString.annotate({ description: "ISO 8601" })),
  limit: Schema.optionalKey(MemberLimit),
  offset: Offset,
};

const SpanInputSchema = Schema.Struct(SpanFilter);

export type SpanInput = Pick<
  typeof SpanInputSchema.Type,
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
