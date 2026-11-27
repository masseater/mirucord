import type { ReactNode } from "react";

export const ThreadCorner = (): ReactNode => (
  <span
    aria-hidden="true"
    className="border-dc-line ml-2 h-3 w-3 shrink-0 -translate-y-1 rounded-bl-md border-b-2 border-l-2"
  />
);
