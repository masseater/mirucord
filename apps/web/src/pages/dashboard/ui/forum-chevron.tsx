import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const CHEVRON = "▸";

const ForumChevron = ({ open }: Readonly<{ open: boolean }>): ReactNode => (
  <span aria-hidden="true" className={cn("motion-safe:transition-transform", open && "rotate-90")}>
    {CHEVRON}
  </span>
);

export { ForumChevron };
