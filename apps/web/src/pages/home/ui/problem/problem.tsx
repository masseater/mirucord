import type { ReactNode } from "react";

import { ChannelSection } from "#/pages/home/ui/common/channel-section";
import { Post } from "#/pages/home/ui/message/post";

import { ProblemFigure } from "./problem-figure";

const LEAD = "楽しかった会話も";
const TAIL = "どんどん流れていっちゃう";
const GUIDE = "あの話どこだっけ…";
const CHANNEL = "思い出";
const TIME = "今日 21:00";

const Problem = (): ReactNode => (
  <ChannelSection id="why" name={CHANNEL}>
    <Post time={TIME} guide={GUIDE} lead={LEAD} tail={TAIL}>
      <ProblemFigure />
    </Post>
  </ChannelSection>
);

export { Problem };
