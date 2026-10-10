import type { ReactNode } from "react";

import { HASH } from "./channels";

const ChannelLink = ({ id, name }: Readonly<{ id: string; name: string }>): ReactNode => (
  <a
    href={`#${id}`}
    className="text-dc-muted hover:bg-dc-hover hover:text-dc-text flex items-center gap-1.5 rounded-sm px-2 py-1.5 font-bold whitespace-nowrap no-underline"
  >
    <span aria-hidden="true" className="text-xl leading-none">
      {HASH}
    </span>
    {name}
  </a>
);

export { ChannelLink };
