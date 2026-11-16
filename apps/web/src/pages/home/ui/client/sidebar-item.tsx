import type { ReactNode } from "react";

import type { SidebarRow } from "./sidebar-categories";
import { SidebarRowView } from "./sidebar-row-view";

export const SidebarItem = ({ row }: Readonly<{ row: SidebarRow }>): ReactNode => (
  <li>
    <SidebarRowView row={row} />
  </li>
);
