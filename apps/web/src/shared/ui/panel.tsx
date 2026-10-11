import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const Panel = ({
  accent,
  children,
}: Readonly<{ accent?: string; children: ReactNode }>): ReactNode => (
  <section
    className={cn(
      "bg-dc-sidebar border-dc-line flex flex-col gap-4 rounded-2xl border p-6",
      accent,
    )}
  >
    {children}
  </section>
);

export { Panel };
