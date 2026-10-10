import type { ReactNode } from "react";

import { ChannelSection } from "#/pages/home/ui/common/channel-section";
import { MEMBERS } from "#/pages/home/ui/common/members";
import { memberAuthor, BOT } from "#/pages/home/ui/message/author";
import { Chatter } from "#/pages/home/ui/message/chatter";
import type { ChatLine } from "#/pages/home/ui/message/chatter";
import { Post } from "#/pages/home/ui/message/post";
import { SystemMessage } from "#/pages/home/ui/message/system-message";

import { StepList } from "./step-list";

const LEAD = "3 ステップで";
const TAIL = "すぐ使えるよ";
const GUIDE = "たった 3 つだよ！";
const CHANNEL = "はじめかた";
const TIME = "今日 21:03";
const JOINED = "がサーバーに参加しました。";

const CHATTER: readonly ChatLine[] = [
  {
    author: memberAuthor(MEMBERS.miho),
    time: "今日 21:03",
    text: "招待するだけなら、わたしでもできそう",
    reactions: [],
  },
  {
    author: memberAuthor(MEMBERS.kenta),
    time: "今日 21:03",
    text: "登録したらすぐ使えた",
    reactions: [{ emoji: "🎉", count: 3, by: "others" }],
  },
  {
    author: BOT,
    time: "今日 21:03",
    text: "やったね！なんでも聞いてね",
    reply: { author: memberAuthor(MEMBERS.kenta), text: "登録したらすぐ使えた" },
    reactions: [{ emoji: "💜", count: 2, by: "me" }],
  },
];

const Steps = (): ReactNode => (
  <ChannelSection id="start" name={CHANNEL}>
    <Post time={TIME} guide={GUIDE} lead={LEAD} tail={TAIL}>
      <StepList />
    </Post>
    <Chatter lines={CHATTER} />
    <SystemMessage kind="join" actor={BOT} text={JOINED} time={TIME} />
  </ChannelSection>
);

export { Steps };
