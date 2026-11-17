import { Option, Schema } from "effect";

export const FIRST_OFFSET = 0;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const MAX_MEMBER_LIMIT = 200;
const DEFAULT_MEMBER_LIMIT = 100;
const MAX_MEMBER_IDS = 100;

export const limitOf = (limit: number | undefined): number =>
  Option.getOrElse(Option.fromUndefinedOr(limit), () => DEFAULT_LIMIT);

export const memberLimitOf = (limit: number | undefined): number =>
  Option.getOrElse(Option.fromUndefinedOr(limit), () => DEFAULT_MEMBER_LIMIT);

export const Offset = Schema.optionalKey(
  Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST_OFFSET)).annotate({
    description: "Advance by limit to read the next page",
  }),
);

export const Limit = Schema.optionalKey(
  Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_LIMIT })).annotate({
    description: `Default ${DEFAULT_LIMIT}`,
  }),
);

export const Ids = Schema.Array(Schema.String).check(Schema.isMaxLength(MAX_MEMBER_IDS));

export const MemberLimit = Schema.Int.check(
  Schema.isBetween({ minimum: 1, maximum: MAX_MEMBER_LIMIT }),
);
