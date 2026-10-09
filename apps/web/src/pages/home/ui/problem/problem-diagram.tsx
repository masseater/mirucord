import type { ReactNode } from "react";

import { AiNode } from "#/pages/home/ui/common/ai-node";

import { CrossMark } from "./cross-mark";
import { ServiceNode } from "./service-node";

const TITLE_ID = "problem-diagram-title";
const LABEL = "Slack と Notion は AI につながっているが Discord はつながっていない図";
const OFFICIAL = "公式 MCP あり";
const MISSING = "つながらない";
const AI_CAPTION = "Claude など";

const ProblemDiagram = (): ReactNode => (
  <svg viewBox="0 0 1000 420" aria-labelledby={TITLE_ID} className="block h-auto w-full min-w-180">
    <title id={TITLE_ID}>{LABEL}</title>
    <path
      d="M270 88 C 480 88, 520 210, 700 210"
      className="stroke-sumi dash-flow motion-safe:animate-flow"
      fill="none"
      strokeWidth="2"
    />
    <path
      d="M270 210 L 700 210"
      className="stroke-sumi dash-flow motion-safe:animate-flow"
      fill="none"
      strokeWidth="2"
    />
    <path
      d="M270 332 C 380 332, 420 300, 470 290"
      className="stroke-shu"
      fill="none"
      strokeWidth="2"
      strokeDasharray="4 6"
    />
    <ServiceNode top="40" name="Slack" status={OFFICIAL} tone="connected" />
    <ServiceNode top="162" name="Notion" status={OFFICIAL} tone="connected" />
    <ServiceNode top="284" name="Discord" status={MISSING} tone="missing" />
    <CrossMark />
    <AiNode left="700" top="130" caption={AI_CAPTION} />
  </svg>
);

export { ProblemDiagram };
