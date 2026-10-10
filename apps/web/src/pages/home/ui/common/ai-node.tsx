import type { ReactNode } from "react";
import { siClaude } from "simple-icons";

const AI_LABEL = "AI";

const AiNode = ({
  left,
  top,
  caption,
}: Readonly<{ left: string; top: string; caption: string }>): ReactNode => (
  <g transform={`translate(${left} ${top})`}>
    <rect y="8" width="230" height="160" rx="40" className="fill-ink" />
    <rect width="230" height="160" rx="40" className="fill-butter stroke-ink" strokeWidth="3" />
    <svg
      x="103"
      y="24"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="fill-claude"
    >
      <path d={siClaude.path} />
    </svg>
    <text x="115" y="96" textAnchor="middle" className="fill-ink text-4xl font-black">
      {AI_LABEL}
    </text>
    <text x="115" y="128" textAnchor="middle" className="fill-ink-soft text-sm font-bold">
      {caption}
    </text>
  </g>
);

export { AiNode };
