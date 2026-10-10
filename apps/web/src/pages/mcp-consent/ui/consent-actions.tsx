import type { ReactNode } from "react";

import { PopButton } from "#/shared/ui/pop-button";

const ALLOW = "許可する";
const DENY = "許可しない";

const ConsentActions = ({
  locked,
  onAllow,
  onDeny,
}: Readonly<{ locked: boolean; onAllow: () => void; onDeny: () => void }>): ReactNode => (
  <div className="flex flex-wrap gap-4">
    <PopButton tone="grape" disabled={locked} onClick={onAllow}>
      {ALLOW}
    </PopButton>
    <PopButton tone="pink" disabled={locked} onClick={onDeny}>
      {DENY}
    </PopButton>
  </div>
);

export { ConsentActions };
