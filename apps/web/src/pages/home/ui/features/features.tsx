import type { ReactNode } from "react";

import { ChannelSection } from "#/pages/home/ui/common/channel-section";
import { MEMBERS } from "#/pages/home/ui/common/members";
import { memberAuthor, BOT } from "#/pages/home/ui/message/author";
import { Chatter } from "#/pages/home/ui/message/chatter";
import type { ChatLine } from "#/pages/home/ui/message/chatter";
import { Post } from "#/pages/home/ui/message/post";
import { Reactions } from "#/pages/home/ui/message/reactions";

import { FeatureGrid } from "./feature-grid";

const LEAD = "ミルは見ていいとこしか見ないよ！";
const CHANNEL = "とくちょう";
const TIME = "今日 21:02";

const REACTIONS = [
  { emoji: "👀", count: 3, by: "others" },
  { emoji: "✅", count: 2, by: "me" },
] as const;

const CHATTER: readonly ChatLine[] = [
  {
    author: memberAuthor(MEMBERS.yui),
    time: "今日 21:02",
    text: "運営チャンネルの話まで出てきたらどうしようって思ってた",
    reactions: [],
  },
  {
    author: BOT,
    time: "今日 21:02",
    text: "出てこないよ！あなたが読めるチャンネルだけ見るね",
    reply: {
      author: memberAuthor(MEMBERS.yui),
      text: "運営チャンネルの話まで出てきたらどうしようって思ってた",
    },
    reactions: [{ emoji: "🙆", count: 3, by: "others" }],
  },
  {
    author: memberAuthor(MEMBERS.tanaka),
    time: "今日 21:02",
    text: "書きこまないなら、うちの鯖でも入れやすいな",
    reactions: [{ emoji: "👍", count: 4, by: "others" }],
  },
];

const Features = (): ReactNode => (
  <ChannelSection id="features" name={CHANNEL}>
    <Post time={TIME} lead={LEAD}>
      <FeatureGrid />
      <Reactions items={REACTIONS} />
    </Post>
    <Chatter lines={CHATTER} />
  </ChannelSection>
);

export { Features };
