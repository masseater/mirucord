import type { ReactNode } from "react";

import { CtaLink } from "#/pages/home/ui/common/cta-link";
import { SIGN_IN_PATH } from "#/shared/config";

const START = "Discord でログインしてはじめる";
const HOW = "しくみを見る";

const HeroActions = (): ReactNode => (
  <div className="mt-2 flex flex-wrap gap-4">
    <CtaLink href={SIGN_IN_PATH} tone="blurple" size="xl">
      {START}
    </CtaLink>
    <CtaLink href="#how" tone="milk" size="xl">
      {HOW}
    </CtaLink>
  </div>
);

export { HeroActions };
