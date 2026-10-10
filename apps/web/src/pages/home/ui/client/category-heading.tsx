import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

import type { SidebarCategory } from "./sidebar-categories";

const CHEVRON: Readonly<Record<SidebarCategory["state"], string>> = {
  open: "rotate-90",
  collapsed: "rotate-0",
};

const CategoryHeading = ({
  name,
  state,
}: Readonly<{ name: string; state: SidebarCategory["state"] }>): ReactNode => (
  <p className="text-dc-muted flex items-center gap-1 px-0.5 text-xs font-bold">
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-3", CHEVRON[state])}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
    {name}
  </p>
);

export { CategoryHeading };
