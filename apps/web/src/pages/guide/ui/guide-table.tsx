import type { ReactNode } from "react";

import { TableBody } from "./table-body";
import { TableHead } from "./table-head";

const GuideTable = ({
  head,
  rows,
}: Readonly<{ head: readonly string[]; rows: readonly (readonly string[])[] }>): ReactNode => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-md border-collapse text-left text-sm">
      <TableHead head={head} />
      <TableBody head={head} rows={rows} />
    </table>
  </div>
);

export { GuideTable };
