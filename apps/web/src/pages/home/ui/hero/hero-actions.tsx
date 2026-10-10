import type { ReactNode } from "react";

import { DcLink } from "#/pages/home/ui/message/dc-link";
import { DASHBOARD_PATH } from "#/shared/config";

const START = "Discord でログインしてはじめる";
const HOW = "しくみを見る";

const HeroActions = (): ReactNode => (
  <div className="mt-2 flex flex-wrap gap-3">
    <DcLink href={DASHBOARD_PATH} tone="primary" size="lg">
      {START}
    </DcLink>
    <DcLink href="#how" tone="secondary" size="lg">
      {HOW}
    </DcLink>
  </div>
);

export { HeroActions };
