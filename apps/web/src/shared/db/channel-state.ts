export const BACKFILLS = ["pending", "done"] as const;
export const BOT_ACCESSES = ["readable", "hidden"] as const;

export type BotAccessStatus = (typeof BOT_ACCESSES)[number];

export type Backfill = (typeof BACKFILLS)[number];
