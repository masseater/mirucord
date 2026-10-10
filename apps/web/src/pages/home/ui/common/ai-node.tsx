import type { ReactNode } from "react";
import { siClaude } from "simple-icons";

const AI_LABEL = "AI";

const AiNode = ({
  left,
  top,
  caption,
}: Readonly<{ left: string; top: string; caption: string }>): ReactNode => (
  <g transform={`translate(${left} ${top})`}>
    <rect width="230" height="160" rx="22" className="fill-sumi" />
    <svg
      x="24"
      y="24"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="fill-claude"
    >
      <path d={siClaude.path} />
    </svg>
    <text x="115" y="84" textAnchor="middle" className="fill-paper font-mincho text-5xl font-black">
      {AI_LABEL}
    </text>
    <text x="115" y="122" textAnchor="middle" className="fill-kinu text-sm">
      {caption}
    </text>
  </g>
);

export { AiNode };
