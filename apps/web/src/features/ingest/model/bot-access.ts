import { DateTime, Duration, Function } from "effect";

const DATA_FIRST_ARITY = 2;
const RETENTION_DAYS = 30;
const HIDDEN_RETENTION = Duration.days(RETENTION_DAYS);

type BotAccess =
  | Readonly<{ status: "readable" }>
  | Readonly<{ status: "hidden"; since: DateTime.Utc }>;

const observeAccess = ({
  readable,
  previous,
  now,
}: Readonly<{ readable: boolean; previous: BotAccess; now: DateTime.Utc }>): BotAccess => {
  if (readable) {
    return { status: "readable" };
  }
  if (previous.status === "hidden") {
    return previous;
  }
  return { status: "hidden", since: now };
};

const isPastRetention: {
  (now: DateTime.Utc): (access: BotAccess) => boolean;
  (access: BotAccess, now: DateTime.Utc): boolean;
} = Function.dual(
  DATA_FIRST_ARITY,
  (access: BotAccess, now: DateTime.Utc): boolean =>
    access.status === "hidden" &&
    DateTime.isGreaterThanOrEqualTo(now, DateTime.addDuration(access.since, HIDDEN_RETENTION)),
);

export { isPastRetention, observeAccess };
export type { BotAccess };
