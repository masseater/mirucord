import type { Scene } from "#/pages/home/ui/common/channel-scene";
import { SAFETY_CHANNEL } from "#/pages/home/ui/common/channels";
import { MEMBERS } from "#/pages/home/ui/common/members";
import { memberAuthor } from "#/pages/home/ui/message/author";
import { MASCOT_NAME } from "#/shared/config";

import { SpecList } from "./spec-list";

export const SAFETY_SCENE: Scene = {
  channel: SAFETY_CHANNEL,
  time: "今日 21:04",
  heading: { guide: "安心してね！", lead: "大事な思い出だから", tail: "ていねいに預かるよ" },
  figure: <SpecList />,
  chatter: [
    {
      author: memberAuthor(MEMBERS.tanaka),
      text: "暗号化してあるなら、安心して入れられる",
      reactions: [{ emoji: "🔒", count: 3, by: "others" }],
    },
    {
      author: memberAuthor(MEMBERS.yui),
      text: `${MASCOT_NAME}を外したら全部消えるのもいいね`,
      reactions: [{ emoji: "👍", count: 2, by: "me" }],
    },
  ],
  system: {
    kind: "pin",
    actor: memberAuthor(MEMBERS.miho),
    text: "がメッセージをこのチャンネルにピン留めしました。",
  },
};
