import type { ReactNode } from "react";

import { DcLink } from "#/pages/home/ui/message/dc-link";
import { DASHBOARD_PATH, REPOSITORY_URL } from "#/shared/config";

const START = "Discord でログインしてはじめる";
const SOURCE = "GitHub を見る";

const ClosingActions = (): ReactNode => (
  <div className="mt-1 flex flex-wrap gap-2">
    <DcLink href={DASHBOARD_PATH} tone="primary">
      {START}
    </DcLink>
    <DcLink href={REPOSITORY_URL} tone="secondary">
      {SOURCE}
    </DcLink>
  </div>
);

export { ClosingActions };
