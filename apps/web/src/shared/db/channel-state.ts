export const BACKFILLS = ["pending", "done"] as const;
export const BOT_ACCESSES = ["readable", "hidden"] as const;

export type Backfill = (typeof BACKFILLS)[number];
