import type { ReactNode } from "react";

const ARROW = "→";

const CipherRow = ({ before, after }: Readonly<{ before: string; after: string }>): ReactNode => (
  <li className="flex flex-wrap items-center gap-3.5">
    <span>{before}</span>
    <span>{ARROW}</span>
    <span className="bg-paper text-shu rounded-md px-2.5 py-1">{after}</span>
  </li>
);

export { CipherRow };
