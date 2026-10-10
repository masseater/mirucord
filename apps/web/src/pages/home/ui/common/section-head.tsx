import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const SectionHead = ({
  label,
  tone,
  lead,
  tail,
}: Readonly<{ label: string; tone: string; lead: string; tail?: string }>): ReactNode => (
  <div className="mb-12 flex flex-col items-center gap-5 text-center md:mb-16">
    <span
      className={cn(
        "border-ink rounded-full border-2 px-4 py-1 text-sm font-bold tracking-wider",
        tone,
      )}
    >
      {label}
    </span>
    <h2 className="text-3xl leading-snug font-black md:text-5xl">
      <span className="block">{lead}</span>
      <span className="block">{tail}</span>
    </h2>
  </div>
);

export { SectionHead };
