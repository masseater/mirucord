import type { ReactNode } from "react";

import { ChannelSection } from "#/pages/home/ui/common/channel-section";
import { MEMBERS } from "#/pages/home/ui/common/members";
import { BOT, memberAuthor } from "#/pages/home/ui/message/author";
import { Chatter } from "#/pages/home/ui/message/chatter";
import type { ChatLine } from "#/pages/home/ui/message/chatter";
import { Post } from "#/pages/home/ui/message/post";

import { CampThread } from "./camp-thread";
import { ScatterScene } from "./scatter-scene";

const LEAD = "楽しかった会話も";
const TAIL = "あちこちに散らばっちゃう";
const GUIDE = "あの話どこだっけ…？";
const CHANNEL = "思い出";
const TIME = "今日 21:00";
const ASKER = memberAuthor(MEMBERS.yui);

const CHATTER: readonly ChatLine[] = [
  {
    author: BOT,
    time: TIME,
    text: "まかせて！ミルがさがしてくるね",
    reply: { author: ASKER, text: GUIDE },
    reactions: [{ emoji: "🙏", count: 3, by: "others" }],
  },
];

const Problem = (): ReactNode => (
  <ChannelSection id="why" name={CHANNEL}>
    <Post author={ASKER} time={TIME} guide={GUIDE} lead={LEAD} tail={TAIL} />
    <Chatter lines={CHATTER} />
    <CampThread />
    <ScatterScene />
  </ChannelSection>
);

export { Problem };
