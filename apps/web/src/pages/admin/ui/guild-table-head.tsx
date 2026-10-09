import type { ReactNode } from "react";

const COLUMNS = ["Server", "Joined", "Channels", "Backfilled", "Messages"] as const;

const GuildTableHead = (): ReactNode => (
  <thead>
    <tr>
      {COLUMNS.map((column) => (
        <th key={column} className="p-2 text-left">
          {column}
        </th>
      ))}
    </tr>
  </thead>
);

export { GuildTableHead };
