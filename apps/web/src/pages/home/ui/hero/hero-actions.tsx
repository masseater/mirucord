import type { ReactNode } from "react";

import { PopLink } from "#/pages/home/ui/common/pop-link";
import { DASHBOARD_PATH } from "#/shared/config";

const START = "Discord でログインしてはじめる";
const HOW = "しくみを見る";

const HeroActions = (): ReactNode => (
  <div className="mt-2 flex flex-wrap gap-4">
    <PopLink href={DASHBOARD_PATH} tone="blurple" size="lg">
      {START}
    </PopLink>
    <PopLink href="#how" tone="milk" size="lg">
      {HOW}
    </PopLink>
  </div>
);

export { HeroActions };
