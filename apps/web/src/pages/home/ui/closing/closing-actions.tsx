import type { ReactNode } from "react";

import { PopLink } from "#/pages/home/ui/common/pop-link";
import { REPOSITORY_URL, DASHBOARD_PATH } from "#/shared/config";

const START = "Discord でログインしてはじめる";
const SOURCE = "GitHub を見る";

const ClosingActions = (): ReactNode => (
  <div className="flex flex-wrap justify-center gap-4">
    <PopLink href={DASHBOARD_PATH} tone="blurple" size="lg">
      {START}
    </PopLink>
    <PopLink href={REPOSITORY_URL} tone="milk" size="lg">
      {SOURCE}
    </PopLink>
  </div>
);

export { ClosingActions };
