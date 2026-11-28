import { Option, Result, Schema } from "effect";
import { Base64Url } from "effect/encoding";

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

export const DeprecatedOffset = Schema.optionalKey(
  Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST_OFFSET)).annotate({
    description: "Deprecated: use cursor. Ignored when cursor is given",
  }),
);

export const Cursor = Schema.optionalKey(
  Schema.String.annotate({
    description:
      "The nextCursor of the previous page. Repeat the other fields unchanged. Takes the place of offset",
  }),
);

const CursorOffset = Schema.fromJsonString(Schema.Struct({ offset: Schema.Int }));

export const cursorOf = (offset: number): string =>
  Schema.encodeOption(CursorOffset)({ offset }).pipe(
    Option.map(Base64Url.encode),
    Option.getOrElse(() => ""),
  );

export const offsetOfCursor = (cursor: string): Option.Option<number> =>
  Base64Url.decodeString(cursor).pipe(
    Result.getSuccess,
    Option.flatMap((json) => Schema.decodeOption(CursorOffset)(json)),
    Option.map(({ offset }) => offset),
    Option.filter((offset) => offset >= FIRST_OFFSET),
  );

export const hasBadCursor = (cursor: string | undefined): boolean =>
  Option.exists(Option.fromUndefinedOr(cursor), (given) => Option.isNone(offsetOfCursor(given)));

export const nextCursorOf = (
  page: Readonly<{ offset: number; shown: number; total: number }>,
): Option.Option<string> =>
  Option.liftPredicate(page.offset + page.shown, (next) => next < page.total).pipe(
    Option.map(cursorOf),
  );

export const BAD_CURSOR = "The cursor is not valid; omit it to start from the first page";

export const Limit = Schema.optionalKey(
  Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_LIMIT })).annotate({
    description: `Default ${DEFAULT_LIMIT}`,
  }),
);

export const Ids = Schema.Array(Schema.String).check(Schema.isMaxLength(MAX_MEMBER_IDS));

export const MemberLimit = Schema.Int.check(
  Schema.isBetween({ minimum: 1, maximum: MAX_MEMBER_LIMIT }),
);
