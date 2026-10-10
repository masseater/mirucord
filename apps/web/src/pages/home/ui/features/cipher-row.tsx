import type { ReactNode } from "react";

const ARROW = "→";

const CipherRow = ({ before, after }: Readonly<{ before: string; after: string }>): ReactNode => (
  <li className="flex flex-wrap items-center gap-2.5">
    <span>{before}</span>
    <span>{ARROW}</span>
    <span className="bg-milk text-pink-deep rounded-full px-3 py-1 font-mono">{after}</span>
  </li>
);

export { CipherRow };
