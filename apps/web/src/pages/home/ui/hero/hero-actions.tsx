import type { ReactNode } from "react";

import { CtaLink } from "#/pages/home/ui/common/cta-link";

const START = "無料で始める";
const HOW = "仕組みを見る";

const HeroActions = (): ReactNode => (
  <div className="mx-auto flex w-full max-w-6xl flex-wrap gap-3 px-5 pt-28 pb-24 lg:pt-8">
    <CtaLink href="#start" tone="shu" size="xl">
      {START}
    </CtaLink>
    <CtaLink href="#how" tone="sumi" size="xl">
      {HOW}
    </CtaLink>
  </div>
);

export { HeroActions };
