import type { ReactNode } from "react";

import { AiNode } from "#/pages/home/ui/common/ai-node";

import { ServiceNode } from "./service-node";

const TITLE_ID = "problem-diagram-title";
const LABEL = "Slack と Notion は AI につながっているが Discord はつながっていない図";
const OFFICIAL = "公式 MCP あり";
const MISSING = "つながらない…";
const AI_CAPTION = "Claude など";
const SAD = "(´・ω・`)";

const ProblemDiagram = (): ReactNode => (
  <svg viewBox="0 0 1000 440" aria-labelledby={TITLE_ID} className="block h-auto w-full min-w-180">
    <title id={TITLE_ID}>{LABEL}</title>
    <path
      d="M290 88 C 500 88, 520 210, 700 210"
      className="stroke-mint-deep dash-flow motion-safe:animate-flow"
      fill="none"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="M290 210 L 700 210"
      className="stroke-mint-deep dash-flow motion-safe:animate-flow"
      fill="none"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="M290 332 C 380 332, 420 316, 460 310"
      className="stroke-pink-deep"
      fill="none"
      strokeWidth="5"
      strokeLinecap="round"
      strokeDasharray="2 12"
    />
    <ServiceNode top="40" name="Slack" status={OFFICIAL} tone="connected" />
    <ServiceNode top="162" name="Notion" status={OFFICIAL} tone="connected" />
    <ServiceNode top="284" name="Discord" status={MISSING} tone="missing" />
    <text x="500" y="318" textAnchor="middle" className="fill-pink-deep text-2xl font-black">
      {SAD}
    </text>
    <AiNode left="700" top="126" caption={AI_CAPTION} />
  </svg>
);

export { ProblemDiagram };
