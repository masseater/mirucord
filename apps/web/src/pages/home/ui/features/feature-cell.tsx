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
      "border-ink shadow-pop flex flex-col gap-6 rounded-3xl border-2 p-7 motion-safe:transition-transform motion-safe:hover:-translate-y-1",
      className,
    )}
  >
    <span className="bg-ink text-milk grid size-10 place-items-center rounded-full text-lg font-black">
      {number}
    </span>
    <h3 className="text-2xl leading-snug font-black">
      <span className="block">{lead}</span>
      <span className="block">{tail}</span>
    </h3>
    {children}
  </div>
);

export { FeatureCell };
