import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";

const TEXT = "ミルがさがし中…";

const Thinking = (): ReactNode => (
  <p aria-hidden="true" className="faq-thinking text-dc-muted flex items-center gap-2 text-sm">
    <Mascot className="motion-safe:animate-wiggle size-6" />
    {TEXT}
  </p>
);

export { Thinking };
