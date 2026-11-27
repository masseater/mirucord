import type { ReactNode } from "react";
import { siClaude } from "simple-icons";

import { BrandMark } from "#/pages/home/ui/common/brand-mark";

import { FlowCard } from "./flow-card";
import { FlowLabel } from "./flow-label";

const AI_LABEL = "AI";

export const AiNode = ({
  left,
  top,
  caption,
}: Readonly<{ left: string; top: string; caption: string }>): ReactNode => (
  <FlowCard left={left} top={top} height={160} fill="fill-butter" shadow radius={40}>
    <BrandMark path={siClaude.path} left="103" top="24" size="24" className="fill-claude" />
    <FlowLabel y={96} tone="fill-ink text-4xl font-black">
      {AI_LABEL}
    </FlowLabel>
    <FlowLabel y={128} tone="fill-ink-soft text-sm font-bold">
      {caption}
    </FlowLabel>
  </FlowCard>
);
