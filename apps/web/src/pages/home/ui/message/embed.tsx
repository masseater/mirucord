import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

export const Embed = ({
  accent,
  title,
  children,
}: Readonly<{ accent: string; title?: string; children: ReactNode }>): ReactNode => (
  <div
    className={cn("bg-dc-sidebar mt-1 grid max-w-xl gap-3 rounded-sm border-l-4 px-4 py-3", accent)}
  >
    {typeof title === "string" && <h3 className="text-dc-bright font-bold">{title}</h3>}
    {children}
  </div>
);
