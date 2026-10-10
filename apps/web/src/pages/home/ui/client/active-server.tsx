import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";

const ActiveServer = (): ReactNode => (
  <span className="relative flex w-full justify-center">
    <span className="bg-dc-bright absolute top-1 left-0 h-10 w-1 rounded-r-full" />
    <Mascot className="bg-lavender size-12 rounded-2xl p-1.5" />
  </span>
);

export { ActiveServer };
