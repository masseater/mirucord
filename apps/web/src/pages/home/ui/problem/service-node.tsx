import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const TONES = {
  connected: { frame: "stroke-kinu", note: "fill-nezumi", dash: "none" },
  missing: { frame: "stroke-shu", note: "fill-shu", dash: "5 5" },
} as const;

const ServiceNode = ({
  top,
  name,
  status,
  tone,
}: Readonly<{
  top: string;
  name: string;
  status: string;
  tone: keyof typeof TONES;
}>): ReactNode => (
  <g transform={`translate(70 ${top})`}>
    <rect
      width="200"
      height="96"
      rx="16"
      className={cn("fill-paper", TONES[tone].frame)}
      strokeDasharray={TONES[tone].dash}
    />
    <text x="28" y="46" className="fill-sumi text-base font-bold">
      {name}
    </text>
    <text x="28" y="70" className={cn("text-sm", TONES[tone].note)}>
      {status}
    </text>
  </g>
);

export { ServiceNode };
