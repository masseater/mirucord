import type { ReactNode } from "react";

import { MEMBERS } from "#/pages/home/ui/common/members";
import { BOT, memberAuthor } from "#/pages/home/ui/message/author";
import { Chatter } from "#/pages/home/ui/message/chatter";
import type { ChatLine } from "#/pages/home/ui/message/chatter";
import { Message } from "#/pages/home/ui/message/message";
import { PostHeading } from "#/pages/home/ui/message/post-heading";
import { SystemMessage } from "#/pages/home/ui/message/system-message";
import { MASCOT_NAME } from "#/shared/config";

import { SpecList } from "./spec-list";

const LEAD = "大事な思い出だから";
const TAIL = "ていねいに預かるよ";
const GUIDE = "安心してね！";
const TIME = "今日 21:04";
const PINNED = "がメッセージをこのチャンネルにピン留めしました。";

const CHATTER: readonly ChatLine[] = [
  {
    author: memberAuthor(MEMBERS.tanaka),
    time: "今日 21:04",
    text: "暗号化してあるなら、安心して入れられる",
    reactions: [{ emoji: "🔒", count: 3, by: "others" }],
  },
  {
    author: memberAuthor(MEMBERS.yui),
    time: "今日 21:04",
    text: `${MASCOT_NAME}を外したら全部消えるのもいいね`,
    reactions: [{ emoji: "👍", count: 2, by: "me" }],
  },
];

const SafetyBody = (): ReactNode => (
  <>
    <Message author={BOT} time={TIME}>
      <PostHeading guide={GUIDE} lead={LEAD} tail={TAIL} />
      <SpecList />
    </Message>
    <Chatter lines={CHATTER} />
    <SystemMessage kind="pin" actor={memberAuthor(MEMBERS.miho)} text={PINNED} time={TIME} />
  </>
);

export { SafetyBody };
