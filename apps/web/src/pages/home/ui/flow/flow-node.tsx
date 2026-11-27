import type { ReactNode } from "react";

import { FlowCard } from "./flow-card";
import { FlowLabel } from "./flow-label";

export type NodeShape = Readonly<{ height: number; fill: string; shadow: boolean; radius: number }>;

const CAPTION_TONE = "fill-ink-soft text-sm font-bold";

export const FlowNode = ({
  left,
  top,
  shape,
  title,
  captionY,
  caption,
  children,
}: Readonly<{
  left: string;
  top: string;
  shape: NodeShape;
  title: Readonly<{ y: number; text: string; tone: string }>;
  captionY: number;
  caption: string;
  children: ReactNode;
}>): ReactNode => (
  <FlowCard
    left={left}
    top={top}
    height={shape.height}
    fill={shape.fill}
    shadow={shape.shadow}
    radius={shape.radius}
  >
    {children}
    <FlowLabel y={title.y} tone={title.tone}>
      {title.text}
    </FlowLabel>
    <FlowLabel y={captionY} tone={CAPTION_TONE}>
      {caption}
    </FlowLabel>
  </FlowCard>
);
