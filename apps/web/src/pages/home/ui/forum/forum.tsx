import type { ReactNode } from "react";

import { ChannelHeader } from "#/pages/home/ui/common/channel-header";
import { ChannelSection } from "#/pages/home/ui/common/channel-section";
import { MEMBERS } from "#/pages/home/ui/common/members";
import { memberAuthor, BOT } from "#/pages/home/ui/message/author";
import { Chatter } from "#/pages/home/ui/message/chatter";
import type { ChatLine } from "#/pages/home/ui/message/chatter";
import { Message } from "#/pages/home/ui/message/message";
import { PostHeading } from "#/pages/home/ui/message/post-heading";
import { MASCOT_NAME } from "#/shared/config";

import { ForumPosts } from "./forum-posts";

const LEAD = "フォーラムの投稿も";
const TAIL = `${MASCOT_NAME}が返信まで読むよ`;
const GUIDE = "フォーラムもまかせてね！";
const CHANNEL = "キャンプ部";
const TIME = "今日 21:01";

const RECIPE: ChatLine = {
  author: memberAuthor(MEMBERS.miho),
  time: "今日 21:01",
  text: `レシピのまとめも${MASCOT_NAME}に聞けば一発じゃん`,
  reactions: [],
};

const CHATTER: readonly ChatLine[] = [
  {
    author: memberAuthor(MEMBERS.kenta),
    time: "今日 21:01",
    text: "しおりのスレ、返信 40 件こえてて追えてなかったから助かる",
    reactions: [{ emoji: "🙏", count: 2, by: "others" }],
  },
  RECIPE,
  {
    author: BOT,
    time: "今日 21:01",
    text: "まかせて！返信のおくのほうまで読むよ",
    reply: RECIPE,
    reactions: [{ emoji: "💜", count: 3, by: "me" }],
  },
];

const Forum = (): ReactNode => (
  <ChannelSection id="forum">
    <ChannelHeader name={CHANNEL} kind="forum" />
    <Message author={BOT} time={TIME}>
      <PostHeading guide={GUIDE} lead={LEAD} tail={TAIL} />
      <ForumPosts />
    </Message>
    <Chatter lines={CHATTER} />
  </ChannelSection>
);

export { Forum };
