import { HOW_CHANNEL } from "#/pages/home/ui/common/channels";
import { MEMBERS } from "#/pages/home/ui/common/members";
import type { Scene } from "#/pages/home/ui/common/scene";
import { memberAuthor, BOT } from "#/pages/home/ui/message/author";
import type { ChatLine } from "#/pages/home/ui/message/chat-line";
import { MASCOT_NAME } from "#/shared/config";

import { FlowFigure } from "./flow-figure";

const QUESTION: ChatLine = {
  author: memberAuthor(MEMBERS.tanaka),
  text: "AI に聞くと Discord の中まで見てくれるってこと？",
  reactions: [],
};

export const FLOW_SCENE: Scene = {
  channel: HOW_CHANNEL,
  time: "今日 21:01",
  heading: { guide: "まかせてね！", lead: `${MASCOT_NAME}が`, tail: "思い出をさがしてくる" },
  figure: <FlowFigure />,
  reactions: [{ emoji: "💡", count: 4, by: "others" }],
  chatter: [
    QUESTION,
    {
      author: BOT,
      text: `そうだよ！${MASCOT_NAME}がかわりにさがして、AI にわたすの`,
      reply: QUESTION,
      reactions: [{ emoji: "👀", count: 2, by: "others" }],
    },
    {
      author: memberAuthor(MEMBERS.yui),
      text: "前からこれ欲しかった",
      reactions: [{ emoji: "🙌", count: 3, by: "me" }],
    },
  ],
  ending: { kind: "none" },
};
