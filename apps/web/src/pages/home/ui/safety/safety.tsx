import type { ReactNode } from "react";

import { ChannelSection } from "#/pages/home/ui/common/channel-section";
import { Post } from "#/pages/home/ui/message/post";

import { SpecList } from "./spec-list";

const LEAD = "大事な思い出だから";
const TAIL = "ていねいに預かります";
const GUIDE = "大事にあずかるね";
const CHANNEL = "あんしん";
const TIME = "今日 21:04";

const Safety = (): ReactNode => (
  <ChannelSection id="safety" name={CHANNEL}>
    <Post time={TIME} guide={GUIDE} lead={LEAD} tail={TAIL}>
      <SpecList />
    </Post>
  </ChannelSection>
);

export { Safety };
