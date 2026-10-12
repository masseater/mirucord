import { DateTime } from "effect";

const POLL_CRON = "32 * * * *";
const SYNC_CRON = "2 18 * * *";
const POLL_SLOTS = 24n;

const isPollDue = ({
  guildId,
  now,
}: Readonly<{ guildId: string; now: DateTime.DateTime }>): boolean =>
  BigInt(guildId) % POLL_SLOTS === BigInt(DateTime.getPartUtc(now, "hour"));

export { isPollDue, POLL_CRON, SYNC_CRON };
