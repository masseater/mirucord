import type { ReactNode } from "react";

import { CipherRow } from "./cipher-row";

const ROWS = [
  { before: "リリースは 3/21 に延期で確定", after: "q7Vb2…Xe9=" },
  { before: "Bot を外す", after: "すべて削除" },
] as const;

const CipherList = (): ReactNode => (
  <ul className="grid gap-2.5 font-mono">
    {ROWS.map((row) => (
      <CipherRow key={row.before} before={row.before} after={row.after} />
    ))}
  </ul>
);

export { CipherList };
