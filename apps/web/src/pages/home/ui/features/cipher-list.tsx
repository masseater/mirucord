import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { MASCOT_NAME } from "#/shared/config";

import { CipherRow } from "./cipher-row";

const ROWS = [
  { before: "カレー焦がさない", after: "q7Vb2…Xe9=" },
  { before: `${MASCOT_NAME}を外す`, after: "ぜんぶ削除" },
] as const;

const CipherList = (): ReactNode => (
  <ul className="grid gap-2.5 text-sm font-bold">
    {pipe(
      ROWS,
      Array.map((row) => <CipherRow key={row.before} before={row.before} after={row.after} />),
    )}
  </ul>
);

export { CipherList };
