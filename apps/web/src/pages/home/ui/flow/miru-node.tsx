import type { ReactNode } from "react";

import { mascotSrc } from "#/shared/brand";
import { SERVICE_NAME } from "#/shared/config";

import { FlowCard } from "./flow-card";
import { FlowLabel } from "./flow-label";

const NAME = SERVICE_NAME;
const CAPTION = "鍵をかけてしまっておく";

export const MiruNode = ({ left, top }: Readonly<{ left: string; top: string }>): ReactNode => (
  <FlowCard left={left} top={top} height={240} fill="fill-pink" shadow={false} radius={48}>
    <image
      href={mascotSrc}
      x="55"
      y="20"
      width="120"
      height="120"
      aria-hidden="true"
      className="motion-safe:animate-wiggle origin-fill"
    />
    <FlowLabel y={184} tone="fill-ink text-xl font-black">
      {NAME}
    </FlowLabel>
    <FlowLabel y={212} tone="fill-ink-soft text-sm font-bold">
      {CAPTION}
    </FlowLabel>
  </FlowCard>
);
