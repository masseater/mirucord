import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { InlineText } from "./inline-text.tsx";

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

const HEAD_LINE = "border-dc-line text-dc-bright border-b";
const BODY_LINE = "border-dc-line text-dc-muted border-b align-top";

type Line = Readonly<{
  className: string;
  cell: (text: string, column: number) => ReactNode;
}>;

const tableLine = (cells: Row, { className, cell }: Line): ReactNode => (
  <tr key={pipe(cells, Array.join("|"))} className={className}>
    {pipe(cells, Array.map(cell))}
  </tr>
);

const bodyRow = (head: Row, row: Row): ReactNode =>
  tableLine(row, { className: BODY_LINE, cell: (text, column) => bodyCell(head[column], text) });

const tableHead = (head: Row): ReactNode => (
  <thead>{tableLine(head, { className: HEAD_LINE, cell: headCell })}</thead>
);

export const GuideTable = ({
  head,
  rows,
}: Readonly<{ head: Row; rows: readonly Row[] }>): ReactNode => (
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
