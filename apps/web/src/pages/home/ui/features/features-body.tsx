import type { ReactNode } from "react";

import { MEMBERS } from "#/pages/home/ui/common/members";
import { memberAuthor, BOT } from "#/pages/home/ui/message/author";
import { Chatter } from "#/pages/home/ui/message/chatter";
import type { ChatLine } from "#/pages/home/ui/message/chatter";
import { Message } from "#/pages/home/ui/message/message";
import { PostHeading } from "#/pages/home/ui/message/post-heading";
import { Reactions } from "#/pages/home/ui/message/reactions";
import { MASCOT_NAME } from "#/shared/config";

import { FeatureGrid } from "./feature-grid";

const LEAD = `${MASCOT_NAME}は見ていいとこしか見ないよ！`;
const TIME = "今日 21:02";

const REACTIONS = [
  { emoji: "👀", count: 3, by: "others" },
  { emoji: "✅", count: 2, by: "me" },
] as const;

const WORRY: ChatLine = {
  author: memberAuthor(MEMBERS.yui),
  time: "今日 21:02",
  text: "運営チャンネルの話まで出てきたらどうしようって思ってた",
  reactions: [],
};

const CHATTER: readonly ChatLine[] = [
  WORRY,
  {
    author: BOT,
    time: "今日 21:02",
    text: "出てこないよ！あなたが読めるチャンネルだけ見るね",
    reply: WORRY,
    reactions: [{ emoji: "🙆", count: 3, by: "others" }],
  },
  {
    author: memberAuthor(MEMBERS.tanaka),
    time: "今日 21:02",
    text: "書きこまないなら、うちの鯖でも入れやすいな",
    reactions: [{ emoji: "👍", count: 4, by: "others" }],
  },
];

const FeaturesBody = (): ReactNode => (
  <>
    <Message author={BOT} time={TIME}>
      <PostHeading lead={LEAD} />
      <FeatureGrid />
      <Reactions items={REACTIONS} />
    </Message>
    <Chatter lines={CHATTER} />
  </>
);

export { FeaturesBody };
