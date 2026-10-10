import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const Embed = ({
  accent,
  children,
}: Readonly<{ accent: string; children: ReactNode }>): ReactNode => (
  <div
    className={cn("bg-dc-sidebar mt-1 grid max-w-xl gap-3 rounded-sm border-l-4 px-4 py-3", accent)}
  >
    {children}
  </div>
);

export { Embed };
