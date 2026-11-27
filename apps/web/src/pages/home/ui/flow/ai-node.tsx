import type { ReactNode } from "react";
import { siClaude } from "simple-icons";

import { BrandMark } from "#/pages/home/ui/common/brand-mark";

import { FlowNode } from "./flow-node";

const SHAPE = { height: 160, fill: "fill-butter", shadow: true, radius: 40 } as const;
const TITLE = { y: 96, tone: "fill-ink text-4xl font-black", text: "AI" } as const;

export const AiNode = ({
  left,
  top,
  caption,
}: Readonly<{ left: string; top: string; caption: string }>): ReactNode => (
  <FlowNode left={left} top={top} shape={SHAPE} title={TITLE} captionY={128} caption={caption}>
    <BrandMark path={siClaude.path} left="103" top="24" size="24" className="fill-claude" />
  </FlowNode>
);
