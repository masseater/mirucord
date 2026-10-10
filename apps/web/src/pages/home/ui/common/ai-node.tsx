import type { ReactNode } from "react";

import { ClaudeMark } from "./claude-mark";

const AI_LABEL = "AI";

const AiNode = ({
  left,
  top,
  caption,
}: Readonly<{ left: string; top: string; caption: string }>): ReactNode => (
  <g transform={`translate(${left} ${top})`}>
    <rect width="230" height="160" rx="22" className="fill-sumi" />
    <ClaudeMark left="24" top="24" size="22" />
    <text x="115" y="84" textAnchor="middle" className="fill-paper font-mincho text-5xl font-black">
      {AI_LABEL}
    </text>
    <text x="115" y="122" textAnchor="middle" className="fill-kinu text-sm">
      {caption}
    </text>
  </g>
);

export { AiNode };
