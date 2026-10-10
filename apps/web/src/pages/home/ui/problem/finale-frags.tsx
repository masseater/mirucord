import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

import { FRAGMENTS } from "./fragments";

const FinaleFrags = (): ReactNode => (
  <ul aria-hidden="true" className="finale-frags">
    {FRAGMENTS.map((fragment) => (
      <li
        key={fragment.text}
        className="finale-frag finale-part bg-dc-sidebar border-dc-line grid rounded-lg border px-3 py-2 text-sm"
      >
        <span className={cn("font-bold", fragment.member.tone)}>{fragment.member.name}</span>
        <span className="text-dc-text">{fragment.text}</span>
      </li>
    ))}
  </ul>
);

export { FinaleFrags };
