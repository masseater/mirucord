import type { ReactNode } from "react";

import { FlowCard } from "./flow-card.tsx";
import { FlowLabel } from "./flow-label.tsx";

export type NodeSpec = Readonly<{
  shape: Readonly<{ height: number; fill: string; shadow: boolean; radius: number }>;
  title: Readonly<{ y: number; text: string; tone: string }>;
  caption: Readonly<{ y: number; text: string }>;
}>;

const CAPTION_TONE = "fill-ink-soft text-sm font-bold";

export const FlowNode = ({
  left,
  top,
  node,
  children,
}: Readonly<{ left: string; top: string; node: NodeSpec; children: ReactNode }>): ReactNode => (
  <FlowCard
    left={left}
    top={top}
    height={node.shape.height}
    fill={node.shape.fill}
    shadow={node.shape.shadow}
    radius={node.shape.radius}
  >
    {children}
    <FlowLabel y={node.title.y} tone={node.title.tone}>
      {node.title.text}
    </FlowLabel>
    <FlowLabel y={node.caption.y} tone={CAPTION_TONE}>
      {node.caption.text}
    </FlowLabel>
  </FlowCard>
);
