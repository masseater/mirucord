import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const TONES = {
  connected: { frame: "fill-mint", note: "fill-ink-soft" },
  missing: { frame: "fill-pink", note: "fill-pink-deep" },
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
    <rect y="6" width="220" height="96" rx="48" className="fill-ink" />
    <rect
      width="220"
      height="96"
      rx="48"
      className={cn("stroke-ink", TONES[tone].frame)}
      strokeWidth="3"
    />
    <text x="110" y="44" textAnchor="middle" className="fill-ink text-lg font-black">
      {name}
    </text>
    <text x="110" y="70" textAnchor="middle" className={cn("text-sm font-bold", TONES[tone].note)}>
      {status}
    </text>
  </g>
);

export { ServiceNode };
