import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

import { LINK_ROWS, PAGE_ROWS, rowKey } from "./sidebar-categories";
import { SidebarItem } from "./sidebar-item";

export const ChannelItems = ({ className }: Readonly<{ className: string }>): ReactNode => (
  <ul className={cn("gap-0.5", className)}>
    {pipe(
      [...LINK_ROWS, ...PAGE_ROWS],
      Array.map((row) => <SidebarItem key={rowKey(row)} row={row} />),
    )}
  </ul>
);
