import type { ReactNode } from "react";

const TableHead = ({ head }: Readonly<{ head: readonly string[] }>): ReactNode => (
  <thead>
    <tr className="border-dc-line text-dc-bright border-b">
      {head.map((cell) => (
        <th key={cell} scope="col" className="px-2 py-2 font-bold">
          {cell}
        </th>
      ))}
    </tr>
  </thead>
);

export { TableHead };
