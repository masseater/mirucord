import { FEATURES_CHANNEL } from "#/pages/home/ui/common/channels";
import { MEMBERS } from "#/pages/home/ui/common/members";
import type { Scene } from "#/pages/home/ui/common/scene";
import { BOT, memberAuthor } from "#/pages/home/ui/message/author";
import type { ChatLine } from "#/pages/home/ui/message/chat-line";
import { MASCOT_NAME } from "#/shared/config";

import { FeatureGrid } from "./feature-grid.tsx";

const WORRY: ChatLine = {
  author: memberAuthor(MEMBERS.yui),
  text: "運営チャンネルの話まで出てきたらどうしようって思ってた",
  reactions: [],
};

export const FEATURES_SCENE: Scene = {
  channel: FEATURES_CHANNEL,
  time: "今日 21:02",
  heading: { lead: `${MASCOT_NAME}は見ていいとこしか見ないよ！` },
  figure: <FeatureGrid />,
  reactions: [
    { emoji: "👀", count: 3, by: "others" },
    { emoji: "✅", count: 2, by: "me" },
  ],
  chatter: [
    WORRY,
    {
      author: BOT,
      text: "出てこないよ！あなたが読めるチャンネルだけ見るね",
      reply: WORRY,
      reactions: [{ emoji: "🙆", count: 3, by: "others" }],
    },
    {
      author: memberAuthor(MEMBERS.tanaka),
      text: "書きこまないなら、うちの鯖でも入れやすいな",
      reactions: [{ emoji: "👍", count: 4, by: "others" }],
    },
  ],
  ending: { kind: "none" },
};
