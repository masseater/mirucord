import { WHY_CHANNEL } from "#/pages/home/ui/common/channels";
import { MEMBERS } from "#/pages/home/ui/common/members";
import type { Scene } from "#/pages/home/ui/common/scene";
import { BOT, memberAuthor } from "#/pages/home/ui/message/author";
import { MASCOT_NAME } from "#/shared/config";

import { CampThread } from "./camp-thread";
import { ScatterScene } from "./scatter-scene";

const GUIDE = "あの話どこだっけ…？";
const ASKER = memberAuthor(MEMBERS.yui);

export const PROBLEM_SCENE: Scene = {
  channel: WHY_CHANNEL,
  time: "今日 21:00",
  author: ASKER,
  heading: { guide: GUIDE, lead: "楽しかった会話も", tail: "あちこちに散らばっちゃう" },
  chatter: [
    {
      author: BOT,
      text: `まかせて！${MASCOT_NAME}がさがしてくるね`,
      reply: { author: ASKER, text: GUIDE },
      reactions: [{ emoji: "🙏", count: 3, by: "others" }],
    },
  ],
  ending: {
    kind: "content",
    content: (
      <>
        <CampThread />
        <ScatterScene />
      </>
    ),
  },
};
