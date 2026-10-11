import type { ReactNode } from "react";

import { InlineText } from "./inline-text";

const TableRow = ({
  head,
  row,
}: Readonly<{ head: readonly string[]; row: readonly string[] }>): ReactNode => (
  <tr className="border-dc-line text-dc-muted border-b align-top">
    {row.map((cell, column) => (
      <td key={head[column]} className="px-2 py-2 leading-relaxed">
        <InlineText text={cell} />
      </td>
    ))}
  </tr>
);

export { TableRow };
