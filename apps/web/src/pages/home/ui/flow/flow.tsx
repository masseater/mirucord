import type { ReactNode } from "react";

import { ChannelSection } from "#/pages/home/ui/common/channel-section";
import { MEMBERS } from "#/pages/home/ui/common/members";
import { memberAuthor, BOT } from "#/pages/home/ui/message/author";
import { Chatter } from "#/pages/home/ui/message/chatter";
import type { ChatLine } from "#/pages/home/ui/message/chatter";
import { Post } from "#/pages/home/ui/message/post";
import { Reactions } from "#/pages/home/ui/message/reactions";

import { FlowFigure } from "./flow-figure";

const LEAD = "ミルが";
const TAIL = "思い出をさがしてくる";
const GUIDE = "まかせてね！";
const CHANNEL = "しくみ";
const TIME = "今日 21:01";

const REACTIONS = [{ emoji: "💡", count: 4, by: "others" }] as const;

const QUESTION: ChatLine = {
  author: memberAuthor(MEMBERS.tanaka),
  time: "今日 21:01",
  text: "AI に聞くと Discord の中まで見てくれるってこと？",
  reactions: [],
};

const CHATTER: readonly ChatLine[] = [
  QUESTION,
  {
    author: BOT,
    time: "今日 21:01",
    text: "そうだよ！ミルがかわりにさがして、AI にわたすの",
    reply: QUESTION,
    reactions: [{ emoji: "👀", count: 2, by: "others" }],
  },
  {
    author: memberAuthor(MEMBERS.yui),
    time: "今日 21:01",
    text: "前からこれ欲しかった",
    reactions: [{ emoji: "🙌", count: 3, by: "me" }],
  },
];

const Flow = (): ReactNode => (
  <ChannelSection id="how" name={CHANNEL}>
    <Post time={TIME} guide={GUIDE} lead={LEAD} tail={TAIL}>
      <FlowFigure />
      <Reactions items={REACTIONS} />
    </Post>
    <Chatter lines={CHATTER} />
  </ChannelSection>
);

export { Flow };
