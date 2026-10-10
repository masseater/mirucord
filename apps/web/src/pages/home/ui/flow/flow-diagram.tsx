import type { ReactNode } from "react";

import { AiNode } from "#/pages/home/ui/common/ai-node";

import { IndexNode } from "./index-node";
import { ServerNode } from "./server-node";

const TITLE_ID = "flow-diagram-title";
const LABEL = "Discord サーバーのメッセージを mirucord が索引にして MCP で AI に渡す図";
const PROTOCOL = "MCP";
const AI_CAPTION = "日本語で聞くだけ";

const FlowDiagram = (): ReactNode => (
  <svg viewBox="0 0 1000 300" aria-labelledby={TITLE_ID} className="block h-auto w-full min-w-180">
    <title id={TITLE_ID}>{LABEL}</title>
    <path d="M250 150 L 385 150" className="stroke-sumi" fill="none" strokeWidth="2" />
    <path
      d="M615 150 L 750 150"
      className="stroke-sumi dash-flow motion-safe:animate-flow"
      fill="none"
      strokeWidth="2"
    />
    <ServerNode />
    <IndexNode />
    <text x="682" y="136" textAnchor="middle" className="fill-nezumi font-mono text-sm">
      {PROTOCOL}
    </text>
    <AiNode left="750" top="70" caption={AI_CAPTION} />
  </svg>
);

export { FlowDiagram };
