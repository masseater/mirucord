import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

type Point = Readonly<{ left: string; top: string }>;

const CHIPS = [
  { key: "a", leg: "first", tone: "fill-sky-deep" },
  { key: "b", leg: "first", tone: "fill-pink-deep" },
  { key: "c", leg: "first", tone: "fill-butter-deep" },
  { key: "d", leg: "second", tone: "fill-lavender-deep" },
] as const;

const FlowCarry = ({
  starts,
}: Readonly<{ starts: Readonly<{ first: Point; second: Point }> }>): ReactNode => (
  <g aria-hidden="true">
    {CHIPS.map((chip) => (
      <rect
        key={chip.key}
        x={starts[chip.leg].left}
        y={starts[chip.leg].top}
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
