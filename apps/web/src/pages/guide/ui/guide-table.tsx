import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { InlineText } from "./inline-text";

type Row = readonly string[];

const headCell = (cell: string): ReactNode => (
  <th key={cell} scope="col" className="px-2 py-2 font-bold">
    {cell}
  </th>
);

const bodyCell = (column: string | undefined, cell: string): ReactNode => (
  <td key={column} className="px-2 py-2 leading-relaxed">
    <InlineText text={cell} />
  </td>
);

const bodyRow = (head: Row, row: Row): ReactNode => (
  <tr key={pipe(row, Array.join("|"))} className="border-dc-line text-dc-muted border-b align-top">
    {pipe(
      row,
      Array.map((cell, column) => bodyCell(head[column], cell)),
    )}
  </tr>
);

const tableHead = (head: Row): ReactNode => (
  <thead>
    <tr className="border-dc-line text-dc-bright border-b">
      {pipe(
        head,
        Array.map((cell) => headCell(cell)),
      )}
    </tr>
  </thead>
);

const GuideTable = ({ head, rows }: Readonly<{ head: Row; rows: readonly Row[] }>): ReactNode => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-md border-collapse text-left text-sm">
      {tableHead(head)}
      <tbody>
        {pipe(
          rows,
          Array.map((row) => bodyRow(head, row)),
        )}
      </tbody>
    </table>
  </div>
);

export { GuideTable };
