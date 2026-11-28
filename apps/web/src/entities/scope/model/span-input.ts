import { DateTime, Option, Schema } from "effect";

import {
  Cursor,
  DeprecatedOffset,
  FIRST_OFFSET,
  Ids,
  MemberLimit,
  memberLimitOf,
  offsetOfCursor,
} from "#/shared/mcp";

export const SpanFilter = {
  serverId: Schema.String,
  userIds: Schema.optionalKey(Ids),
  channelIds: Schema.optionalKey(Ids),
  since: Schema.optionalKey(Schema.DateTimeUtcFromString.annotate({ description: "ISO 8601" })),
  until: Schema.optionalKey(Schema.DateTimeUtcFromString.annotate({ description: "ISO 8601" })),
  limit: Schema.optionalKey(MemberLimit),
  cursor: Cursor,
  offset: DeprecatedOffset,
};

const SpanInputSchema = Schema.Struct(SpanFilter);

export type SpanInput = Pick<
  typeof SpanInputSchema.Type,
  "userIds" | "since" | "until" | "limit" | "offset" | "cursor"
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

const offsetOf = (input: SpanInput): number =>
  Option.fromUndefinedOr(input.cursor).pipe(
    Option.flatMap(offsetOfCursor),
    Option.orElse(() => Option.fromUndefinedOr(input.offset)),
    Option.getOrElse(() => FIRST_OFFSET),
  );

export const spanLookupOf = (input: SpanInput): SpanLookup => ({
  userIds: Option.getOrNull(Option.fromUndefinedOr(input.userIds)),
  since: millisOf(input.since),
  until: millisOf(input.until),
  limit: memberLimitOf(input.limit),
  offset: offsetOf(input),
});
