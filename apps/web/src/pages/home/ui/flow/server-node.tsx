import type { ReactNode } from "react";
import { siDiscord } from "simple-icons";

import { BrandMark } from "#/pages/home/ui/common/brand-mark";
import { MASCOT_NAME } from "#/shared/config";

import { FlowCard } from "./flow-card";
import { FlowLabel } from "./flow-label";

const TITLE = "みんなのサーバー";
const CAPTION = `${MASCOT_NAME}を招待するだけ`;

export const ServerNode = ({ left, top }: Readonly<{ left: string; top: string }>): ReactNode => (
  <FlowCard left={left} top={top} height={160} fill="fill-lavender" shadow radius={40}>
    <BrandMark path={siDiscord.path} left="91" top="26" size="48" className="fill-discord" />
    <FlowLabel y={108} tone="fill-ink text-base font-black">
      {TITLE}
    </FlowLabel>
    <FlowLabel y={132} tone="fill-ink-soft text-sm font-bold">
      {CAPTION}
    </FlowLabel>
  </FlowCard>
);
