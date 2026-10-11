import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const Pill = ({ tone, children }: Readonly<{ tone: string; children: ReactNode }>): ReactNode => (
  <span className={cn("border-ink rounded-full border-2 px-3 py-0.5 text-xs font-bold", tone)}>
    {children}
  </span>
);

export { Pill };
