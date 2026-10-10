import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const TONES = {
  near: { frame: "fill-butter", fade: "opacity-100" },
  middle: { frame: "fill-mint", fade: "opacity-60" },
  far: { frame: "fill-pink", fade: "opacity-30" },
} as const;

const MemoryNode = ({
  left,
  top,
  name,
  status,
  tone,
}: Readonly<{
  left: string;
  top: string;
  name: string;
  status: string;
  tone: keyof typeof TONES;
}>): ReactNode => (
  <g transform={`translate(${left} ${top})`}>
    <rect y="6" width="240" height="96" rx="48" className={cn("fill-ink", TONES[tone].fade)} />
    <rect
      width="240"
      height="96"
      rx="48"
      className={cn("stroke-ink", TONES[tone].frame, TONES[tone].fade)}
      strokeWidth="3"
    />
    <text x="120" y="44" textAnchor="middle" className="fill-ink text-lg font-black">
      {name}
    </text>
    <text x="120" y="70" textAnchor="middle" className="fill-ink-soft text-sm font-bold">
      {status}
    </text>
  </g>
);

export { MemoryNode };
