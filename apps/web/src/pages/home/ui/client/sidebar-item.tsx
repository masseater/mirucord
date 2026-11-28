import type { ReactNode } from "react";

import type { SidebarRow } from "./sidebar-categories.ts";
import { SidebarRowView } from "./sidebar-row-view.tsx";

export const SidebarItem = ({ row }: Readonly<{ row: SidebarRow }>): ReactNode => (
  <li>
    <SidebarRowView row={row} />
  </li>
);
