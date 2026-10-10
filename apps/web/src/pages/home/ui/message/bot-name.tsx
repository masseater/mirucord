import type { ReactNode } from "react";

import { AppBadge } from "./app-badge";

const NAME = "ミル";

const BotName = (): ReactNode => (
  <>
    <span className="text-lavender font-bold">{NAME}</span>
    <AppBadge />
  </>
);

export { BotName };
