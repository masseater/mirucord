import type { ReactNode } from "react";

import { REPOSITORY_URL, DASHBOARD_PATH } from "#/shared/config";
import { PopLink } from "#/shared/ui/pop-link";

const START = "Discord でログインしてはじめる";
const SOURCE = "GitHub を見る";

const ClosingActions = (): ReactNode => (
  <div className="flex flex-wrap justify-center gap-4">
    <PopLink href={DASHBOARD_PATH} tone="grape" size="lg">
      {START}
    </PopLink>
    <PopLink href={REPOSITORY_URL} tone="milk" size="lg">
      {SOURCE}
    </PopLink>
  </div>
);

export { ClosingActions };
