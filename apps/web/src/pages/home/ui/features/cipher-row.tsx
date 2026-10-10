import type { ReactNode } from "react";

const ARROW = "→";

const CipherRow = ({ before, after }: Readonly<{ before: string; after: string }>): ReactNode => (
  <li className="flex flex-wrap items-center gap-2.5">
    <span>{before}</span>
    <span>{ARROW}</span>
    <code className="bg-dc-rail text-dc-bright rounded-sm px-2 py-0.5 font-mono">{after}</code>
  </li>
);

export { CipherRow };
