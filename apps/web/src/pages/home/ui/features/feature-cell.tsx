import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const FeatureCell = ({
  number,
  lead,
  tail,
  className,
  children,
}: Readonly<{
  number: string;
  lead: string;
  tail?: string;
  className: string;
  children: ReactNode;
}>): ReactNode => (
  <div
    className={cn(
      "relative flex min-h-72 flex-col justify-between gap-7 overflow-hidden rounded-2xl p-9",
      className,
    )}
  >
    <span className="font-mincho absolute top-8 right-8 text-sm tracking-widest opacity-70">
      {number}
    </span>
    <h3 className="font-mincho text-3xl leading-snug font-black">
      <span className="block">{lead}</span>
      <span className="block">{tail}</span>
    </h3>
    {children}
  </div>
);

export { FeatureCell };
