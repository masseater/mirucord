import type { ReactNode } from "react";
import { siDiscord } from "simple-icons";

import { BrandMark } from "#/pages/home/ui/common/brand-mark";
import { MASCOT_NAME } from "#/shared/config";

import { FlowNode } from "./flow-node";

const SHAPE = { height: 160, fill: "fill-lavender", shadow: true, radius: 40 } as const;
const TITLE = { y: 108, tone: "fill-ink text-base font-black", text: "みんなのサーバー" } as const;
const CAPTION = `${MASCOT_NAME}を招待するだけ`;

export const ServerNode = ({ left, top }: Readonly<{ left: string; top: string }>): ReactNode => (
  <FlowNode left={left} top={top} shape={SHAPE} title={TITLE} captionY={132} caption={CAPTION}>
    <BrandMark path={siDiscord.path} left="91" top="26" size="48" className="fill-discord" />
  </FlowNode>
);
