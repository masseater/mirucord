import type { ReactNode } from "react";

import { HASH } from "./channels";

const ChannelHeader = ({
  name,
  children,
}: Readonly<{ name: string; children?: ReactNode }>): ReactNode => (
  <div className="bg-dc-chat border-dc-rail sticky top-0 z-10 flex h-12 items-center gap-2 border-b px-4">
    <span aria-hidden="true" className="text-dc-muted text-2xl leading-none">
      {HASH}
    </span>
    <span className="text-dc-bright font-bold">{name}</span>
    {children}
  </div>
);

export { ChannelHeader };
