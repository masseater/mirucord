import type { ReactNode } from "react";

import { DcLink } from "#/pages/home/ui/common/dc-link";
import { DASHBOARD_PATH } from "#/shared/config";

import { InviteChip } from "./invite-chip";

const CONSENT = "管理画面で同意する";

const InviteActions = (): ReactNode => (
  <div className="flex flex-wrap gap-2">
    <InviteChip />
    <DcLink href={DASHBOARD_PATH} tone="secondary">
      {CONSENT}
    </DcLink>
  </div>
);

export { InviteActions };
