import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const CHIPS = [
  { key: "a", left: "236", tone: "fill-sky-deep" },
  { key: "b", left: "236", tone: "fill-pink-deep" },
  { key: "c", left: "236", tone: "fill-butter-deep" },
  { key: "d", left: "601", tone: "fill-lavender-deep" },
] as const;

const FlowCarry = (): ReactNode => (
  <g aria-hidden="true">
    {CHIPS.map((chip) => (
      <rect
        key={chip.key}
        x={chip.left}
        y="148"
        width="28"
        height="24"
        rx="9"
        data-carry={chip.key}
        className={cn("flow-carry stroke-ink", chip.tone)}
        strokeWidth="3"
      />
    ))}
  </g>
);

export { FlowCarry };
