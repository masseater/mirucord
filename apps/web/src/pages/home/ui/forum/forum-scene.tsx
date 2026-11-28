import { FORUM_CHANNEL } from "#/pages/home/ui/common/channels";
import { MEMBERS } from "#/pages/home/ui/common/members";
import type { Scene } from "#/pages/home/ui/common/scene";
import { BOT, memberAuthor } from "#/pages/home/ui/message/author";
import type { ChatLine } from "#/pages/home/ui/message/chat-line";
import { MASCOT_NAME } from "#/shared/config";

import { ForumPosts } from "./forum-posts.tsx";

const RECIPE: ChatLine = {
  author: memberAuthor(MEMBERS.miho),
  text: `レシピのまとめも${MASCOT_NAME}に聞けば一発じゃん`,
  reactions: [],
};

export const FORUM_SCENE: Scene = {
  channel: FORUM_CHANNEL,
  time: "今日 21:01",
  heading: {
    guide: "フォーラムもまかせてね！",
    lead: "フォーラムの投稿も",
    tail: `${MASCOT_NAME}が返信まで読むよ`,
  },
  figure: <ForumPosts />,
  chatter: [
    {
      author: memberAuthor(MEMBERS.kenta),
      text: "しおりのスレ、返信 40 件こえてて追えてなかったから助かる",
      reactions: [{ emoji: "🙏", count: 2, by: "others" }],
    },
    RECIPE,
    {
      author: BOT,
      text: "まかせて！返信のおくのほうまで読むよ",
      reply: RECIPE,
      reactions: [{ emoji: "💜", count: 3, by: "me" }],
    },
  ],
  ending: { kind: "none" },
};
