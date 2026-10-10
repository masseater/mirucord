import type { ReactNode } from "react";

import { ChannelSection } from "#/pages/home/ui/common/channel-section";
import { Post } from "#/pages/home/ui/message/post";

import { ScatterScene } from "./scatter-scene";

const LEAD = "楽しかった会話も";
const TAIL = "あちこちに散らばっちゃう";
const GUIDE = "あの話どこだっけ…";
const CHANNEL = "思い出";
const TIME = "今日 21:00";

const Problem = (): ReactNode => (
  <ChannelSection id="why" name={CHANNEL}>
    <Post time={TIME} guide={GUIDE} lead={LEAD} tail={TAIL} />
    <ScatterScene />
  </ChannelSection>
);

export { Problem };
