import type { ReactNode } from "react";

import { ChannelSection } from "#/pages/home/ui/common/channel-section";
import { Post } from "#/pages/home/ui/message/post";
import { Reactions } from "#/pages/home/ui/message/reactions";

import { FlowFigure } from "./flow-figure";

const LEAD = "ミルが";
const TAIL = "思い出をさがしてくる";
const GUIDE = "まかせてね";
const CHANNEL = "しくみ";
const TIME = "今日 21:01";

const REACTIONS = [{ emoji: "💡", count: 4, by: "others" }] as const;

const Flow = (): ReactNode => (
  <ChannelSection id="how" name={CHANNEL}>
    <Post time={TIME} guide={GUIDE} lead={LEAD} tail={TAIL}>
      <FlowFigure />
      <Reactions items={REACTIONS} />
    </Post>
  </ChannelSection>
);

export { Flow };
