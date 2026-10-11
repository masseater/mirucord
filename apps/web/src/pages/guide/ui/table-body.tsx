import type { ReactNode } from "react";

import { TableRow } from "./table-row";

const TableBody = ({
  head,
  rows,
}: Readonly<{ head: readonly string[]; rows: readonly (readonly string[])[] }>): ReactNode => (
  <tbody>
    {rows.map((row) => (
      <TableRow key={row.join("|")} head={head} row={row} />
    ))}
  </tbody>
);

export { TableBody };
