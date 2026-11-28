import { START_CHANNEL } from "#/pages/home/ui/common/channels";
import { MEMBERS } from "#/pages/home/ui/common/members";
import type { Scene } from "#/pages/home/ui/common/scene";
import { BOT, memberAuthor } from "#/pages/home/ui/message/author";
import type { ChatLine } from "#/pages/home/ui/message/chat-line";

import { StepList } from "./step-list.tsx";

const REGISTERED: ChatLine = {
  author: memberAuthor(MEMBERS.kenta),
  text: "取り込みが終わったら使えた",
  reactions: [{ emoji: "🎉", count: 3, by: "others" }],
};

export const STEPS_SCENE: Scene = {
  channel: START_CHANNEL,
  time: "今日 21:03",
  heading: { guide: "たった 3 つだよ！", lead: "3 ステップで", tail: "使えるよ" },
  figure: <StepList />,
  chatter: [
    {
      author: memberAuthor(MEMBERS.miho),
      text: "招待するだけなら、わたしでもできそう",
      reactions: [],
    },
    REGISTERED,
    {
      author: BOT,
      text: "やったね！なんでも聞いてね",
      reply: REGISTERED,
      reactions: [{ emoji: "💜", count: 2, by: "me" }],
    },
  ],
  ending: { kind: "system", event: "join", actor: BOT, text: "がサーバーに参加しました。" },
};
