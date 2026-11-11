const BACKFILLS = ["pending", "done"] as const;
const BOT_ACCESSES = ["readable", "hidden"] as const;

type Backfill = (typeof BACKFILLS)[number];

export { BACKFILLS, BOT_ACCESSES };
export type { Backfill };
