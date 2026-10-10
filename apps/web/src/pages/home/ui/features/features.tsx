import type { ReactNode } from "react";

import { ChannelSection } from "#/pages/home/ui/common/channel-section";
import { Post } from "#/pages/home/ui/message/post";
import { Reactions } from "#/pages/home/ui/message/reactions";

import { FeatureGrid } from "./feature-grid";

const LEAD = "ミルは見るだけ";
const TAIL = "見ていいとこだけ";
const GUIDE = "ここをチェックしてね！";
const CHANNEL = "とくちょう";
const TIME = "今日 21:02";

const REACTIONS = [
  { emoji: "👀", count: 3, by: "others" },
  { emoji: "✅", count: 2, by: "me" },
] as const;

const Features = (): ReactNode => (
  <ChannelSection id="features" name={CHANNEL}>
    <Post time={TIME} guide={GUIDE} lead={LEAD} tail={TAIL}>
      <FeatureGrid />
      <Reactions items={REACTIONS} />
    </Post>
  </ChannelSection>
);

export { Features };
