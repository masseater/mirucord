import type { ReactNode } from "react";

const MessageHeading = ({
  lead,
  tail,
}: Readonly<{ lead: string; tail?: string | undefined }>): ReactNode => (
  <h2 className="text-dc-bright font-maru my-1 text-2xl leading-snug font-black md:text-3xl">
    <span className="block">{lead}</span>
    <span className="block">{tail}</span>
  </h2>
);

export { MessageHeading };
