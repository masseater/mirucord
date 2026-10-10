import type { ReactNode } from "react";

import { DASHBOARD_PATH } from "#/shared/config";
import { PopLink } from "#/shared/ui/pop-link";

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
