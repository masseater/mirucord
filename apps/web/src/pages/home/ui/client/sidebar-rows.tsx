import type { ReactNode } from "react";

import type { SidebarRow } from "./sidebar-categories";
import { SidebarItem } from "./sidebar-item";

const rowKey = (row: SidebarRow): string => {
  if (row.type === "link") {
    return row.channel.id;
  }
  if (row.type === "peek") {
    return row.id;
  }
  return row.place.name;
};

const SidebarRows = ({ rows }: Readonly<{ rows: readonly SidebarRow[] }>): ReactNode => (
  <ul className="grid gap-0.5">
    {rows.map((row) => (
      <li key={rowKey(row)}>
        <SidebarItem row={row} />
      </li>
    ))}
  </ul>
);

export { SidebarRows };
