import type { ReactNode } from "react";

import { mascotSrc } from "#/shared/brand";
import { SERVICE_NAME } from "#/shared/config";

import { FlowNode } from "./flow-node";

const SHAPE = { height: 240, fill: "fill-pink", shadow: false, radius: 48 } as const;
const TITLE = { y: 184, tone: "fill-ink text-xl font-black", text: SERVICE_NAME } as const;
const CAPTION = "鍵をかけてしまっておく";

export const MiruNode = ({ left, top }: Readonly<{ left: string; top: string }>): ReactNode => (
  <FlowNode left={left} top={top} shape={SHAPE} title={TITLE} captionY={212} caption={CAPTION}>
    <image
      href={mascotSrc}
      x="55"
      y="20"
      width="120"
      height="120"
      aria-hidden="true"
      className="motion-safe:animate-wiggle origin-fill"
    />
  </FlowNode>
);
