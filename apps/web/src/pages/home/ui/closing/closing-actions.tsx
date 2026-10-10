import type { ReactNode } from "react";

import { CtaLink } from "#/pages/home/ui/common/cta-link";
import { REPOSITORY_URL } from "#/shared/config";

const START = "無料ではじめる";
const SOURCE = "GitHub を見る";

const ClosingActions = (): ReactNode => (
  <div className="flex flex-wrap justify-center gap-4">
    <CtaLink href="#start" tone="blurple" size="xl">
      {START}
    </CtaLink>
    <CtaLink href={REPOSITORY_URL} tone="milk" size="xl">
      {SOURCE}
    </CtaLink>
  </div>
);

export { ClosingActions };
