import type { ReactNode } from "react";

const FragmentGhost = (): ReactNode => (
  <span aria-hidden="true" className="scene-frag-ghost">
    <span className="grid min-h-0 gap-1.5 overflow-hidden">
      <span className="bg-dc-line h-2 w-3/4 rounded-full" />
      <span className="bg-dc-line h-2 w-1/2 rounded-full" />
    </span>
  </span>
);

export { FragmentGhost };
