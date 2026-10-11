import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const ROWS = [
  { id: "a", width: "w-3/4" },
  { id: "b", width: "w-1/2" },
  { id: "c", width: "w-5/6" },
  { id: "d", width: "w-2/3" },
  { id: "e", width: "w-3/4" },
  { id: "f", width: "w-1/2" },
] as const;

const FragmentGhost = (): ReactNode => (
  <span aria-hidden="true" className="scene-frag-ghost">
    <span className="scene-frag-scroll grid gap-1.5">
      {ROWS.map((row) => (
        <span key={row.id} className={cn("bg-dc-line h-2 rounded-full", row.width)} />
      ))}
    </span>
  </span>
);

export { FragmentGhost };
