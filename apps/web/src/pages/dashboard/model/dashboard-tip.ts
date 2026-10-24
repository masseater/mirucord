import { Array, pipe } from "effect";

import type { GuildIngest } from "#/features/ingest/index.server";
import type { ReadyDashboard } from "#/pages/dashboard/model/next-steps";

const WITHDRAWING_TIP = "削除中だよ！";
const INGESTING_TIP = "思い出を集めてるよ";
const INGESTING: ReadonlySet<GuildIngest> = new Set(["waiting", "backfilling"]);

const tipFor = ({ name, guilds }: ReadyDashboard): string => {
  if (
    pipe(
      guilds,
      Array.some(({ ingest }) => ingest === "withdrawing"),
    )
  ) {
    return WITHDRAWING_TIP;
  }
  if (
    pipe(
      guilds,
      Array.some(({ ingest }) => INGESTING.has(ingest)),
    )
  ) {
    return INGESTING_TIP;
  }
  return `${name}さん、おかえり！`;
};

export { tipFor };
