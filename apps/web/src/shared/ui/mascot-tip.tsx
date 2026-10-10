import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";

const MascotTip = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="flex items-end gap-3">
    <Mascot className="motion-safe:animate-wiggle size-16 shrink-0" />
    <p className="border-ink bg-milk mb-6 rounded-2xl rounded-bl-none border-2 px-4 py-2 text-sm leading-relaxed font-bold">
      {children}
    </p>
  </div>
);

export { MascotTip };
