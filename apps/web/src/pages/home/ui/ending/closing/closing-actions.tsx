import type { ReactNode } from "react";

import { CtaLink } from "#/pages/home/ui/common/cta-link";
import { REPOSITORY_URL } from "#/shared/config";

const START = "無料で始める";
const SOURCE = "GitHub を見る";

const ClosingActions = (): ReactNode => (
  <div className="relative mt-12 flex flex-wrap gap-3.5">
    <CtaLink href="#start" tone="shu" size="xl">
      {START}
    </CtaLink>
    <CtaLink href={REPOSITORY_URL} tone="paper" size="xl">
      {SOURCE}
    </CtaLink>
  </div>
);

export { ClosingActions };
