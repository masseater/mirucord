import type { ReactNode } from "react";

import { ClaudeMark } from "./claude-mark";

const APP = "Claude";
const TOOL = "mirucord";

const WindowBar = (): ReactNode => (
  <p className="bg-cream border-line flex items-center gap-2 border-b px-4 py-2 text-sm font-bold">
    <ClaudeMark />
    {APP}
    <span className="bg-lavender ml-auto rounded-full px-2 py-0.5 font-mono text-xs">{TOOL}</span>
  </p>
);

export { WindowBar };
