import type { ReactNode } from "react";

const ClosingTitle = ({ lead, tail }: Readonly<{ lead: string; tail: string }>): ReactNode => (
  <h2 className="font-mincho relative text-4xl leading-snug font-black md:text-6xl">
    <span className="block">{lead}</span>
    <span className="block">{tail}</span>
  </h2>
);

export { ClosingTitle };
