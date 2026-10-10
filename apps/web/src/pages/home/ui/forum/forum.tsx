import type { ReactNode } from "react";

import { ChannelSection } from "#/pages/home/ui/common/channel-section";
import { MEMBERS } from "#/pages/home/ui/common/members";
import { memberAuthor, BOT } from "#/pages/home/ui/message/author";
import { Chatter } from "#/pages/home/ui/message/chatter";
import type { ChatLine } from "#/pages/home/ui/message/chatter";
import { Post } from "#/pages/home/ui/message/post";

import { ForumPosts } from "./forum-posts";

const LEAD = "フォーラムの投稿も";
const TAIL = "ミルが返信まで読むよ";
const GUIDE = "フォーラムもまかせてね！";
const CHANNEL = "キャンプ部";
const TIME = "今日 21:01";

const RECIPE: ChatLine = {
  author: memberAuthor(MEMBERS.miho),
  time: "今日 21:01",
  text: "レシピのまとめもミルに聞けば一発じゃん",
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
  <ChannelSection id="forum" name={CHANNEL} kind="forum">
    <Post time={TIME} guide={GUIDE} lead={LEAD} tail={TAIL}>
      <ForumPosts />
    </Post>
    <Chatter lines={CHATTER} />
  </ChannelSection>
);

export { Forum };
