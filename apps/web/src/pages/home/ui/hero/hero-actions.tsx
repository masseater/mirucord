import type { ReactNode } from "react";

import { CtaLink } from "#/pages/home/ui/common/cta-link";

const START = "無料ではじめる";
const HOW = "しくみを見る";

const HeroActions = (): ReactNode => (
  <div className="mt-2 flex flex-wrap gap-4">
    <CtaLink href="#start" tone="blurple" size="xl">
      {START}
    </CtaLink>
    <CtaLink href="#how" tone="milk" size="xl">
      {HOW}
    </CtaLink>
  </div>
);

export { HeroActions };
