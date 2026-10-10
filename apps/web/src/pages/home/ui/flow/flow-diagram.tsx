import type { ReactNode } from "react";

import { AiNode } from "#/pages/home/ui/common/ai-node";
import { Mascot } from "#/pages/home/ui/common/mascot";

import { ServerNode } from "./server-node";

const TITLE_ID = "flow-diagram-title";
const LABEL = "Discord サーバーのメッセージを mirucord が預かって MCP で AI に渡す図";
const PROTOCOL = "MCP";
const AI_CAPTION = "日本語で聞くだけ";
const NAME = "mirucord";
const CAPTION = "暗号化して預かる";

const FlowDiagram = (): ReactNode => (
  <svg viewBox="0 0 1000 320" aria-labelledby={TITLE_ID} className="block h-auto w-full min-w-180">
    <title id={TITLE_ID}>{LABEL}</title>
    <path
      d="M250 160 L 385 160"
      className="stroke-lavender-deep dash-flow motion-safe:animate-flow"
      fill="none"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="M615 160 L 750 160"
      className="stroke-lavender-deep dash-flow motion-safe:animate-flow"
      fill="none"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <ServerNode />
    <rect
      x="385"
      y="38"
      width="230"
      height="240"
      rx="48"
      className="fill-pink stroke-ink"
      strokeWidth="3"
    />
    <Mascot left="440" top="58" size="120" className="motion-safe:animate-wiggle origin-fill" />
    <text x="500" y="222" textAnchor="middle" className="fill-ink text-xl font-black">
      {NAME}
    </text>
    <text x="500" y="250" textAnchor="middle" className="fill-ink-soft text-sm font-bold">
      {CAPTION}
    </text>
    <text x="682" y="142" textAnchor="middle" className="fill-ink-soft text-sm font-black">
      {PROTOCOL}
    </text>
    <AiNode left="750" top="76" caption={AI_CAPTION} />
  </svg>
);

export { FlowDiagram };
