import type { ReactNode } from "react";

import { MEMBERS } from "#/pages/home/ui/common/members";
import { BOT, memberAuthor } from "#/pages/home/ui/message/author";
import { Chatter } from "#/pages/home/ui/message/chatter";
import type { ChatLine } from "#/pages/home/ui/message/chatter";
import { Message } from "#/pages/home/ui/message/message";
import { PostHeading } from "#/pages/home/ui/message/post-heading";
import { MASCOT_NAME } from "#/shared/config";

import { CampThread } from "./camp-thread";
import { ScatterScene } from "./scatter-scene";

const LEAD = "楽しかった会話も";
const TAIL = "あちこちに散らばっちゃう";
const GUIDE = "あの話どこだっけ…？";
const TIME = "今日 21:00";
const ASKER = memberAuthor(MEMBERS.yui);

const CHATTER: readonly ChatLine[] = [
  {
    author: BOT,
    time: TIME,
    text: `まかせて！${MASCOT_NAME}がさがしてくるね`,
    reply: { author: ASKER, text: GUIDE },
    reactions: [{ emoji: "🙏", count: 3, by: "others" }],
  },
];

const ProblemBody = (): ReactNode => (
  <>
    <Message author={ASKER} time={TIME}>
      <PostHeading guide={GUIDE} lead={LEAD} tail={TAIL} />
    </Message>
    <Chatter lines={CHATTER} />
    <CampThread />
    <ScatterScene />
  </>
);

export { ProblemBody };
