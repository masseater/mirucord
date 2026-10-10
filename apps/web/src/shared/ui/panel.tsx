import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const Panel = ({
  tone = "bg-milk",
  children,
}: Readonly<{ tone?: string; children: ReactNode }>): ReactNode => (
  <section
    className={cn("border-ink shadow-pop-sm flex flex-col gap-4 rounded-3xl border-2 p-6", tone)}
  >
    {children}
  </section>
);

export { Panel };
