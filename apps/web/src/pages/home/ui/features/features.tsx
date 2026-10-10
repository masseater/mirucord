import type { ReactNode } from "react";

import { ChannelSection } from "#/pages/home/ui/client/channel-section";
import { Post } from "#/pages/home/ui/message/post";

import { FeatureGrid } from "./feature-grid";

const LEAD = "ミルは見るだけ";
const TAIL = "見ていい所だけ";
const GUIDE = "読むだけだから安心してね";
const CHANNEL = "とくちょう";
const TIME = "今日 21:02";

const Features = (): ReactNode => (
  <ChannelSection id="features" name={CHANNEL}>
    <Post time={TIME} guide={GUIDE} lead={LEAD} tail={TAIL}>
      <FeatureGrid />
    </Post>
  </ChannelSection>
);

export { Features };
