import type { ReactNode } from "react";

const SectionHead = ({
  label,
  lead,
  tail,
}: Readonly<{ label: string; lead: string; tail?: string }>): ReactNode => (
  <div className="mb-12 flex items-start gap-6 md:mb-16 md:gap-10">
    <span className="border-shu font-mincho text-shu writing-vertical shrink-0 border-r pr-2 text-sm tracking-widest">
      {label}
    </span>
    <h2 className="font-mincho text-4xl leading-snug font-black md:text-6xl">
      <span className="block">{lead}</span>
      <span className="block">{tail}</span>
    </h2>
  </div>
);

export { SectionHead };
