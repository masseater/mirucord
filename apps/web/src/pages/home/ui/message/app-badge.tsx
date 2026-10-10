import type { ReactNode } from "react";

const LABEL = "APP";

const AppBadge = (): ReactNode => (
  <span className="bg-blurple text-dc-bright rounded-sm px-1 text-xs leading-4 font-bold">
    {LABEL}
  </span>
);

export { AppBadge };
