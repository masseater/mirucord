import type { ReactNode } from "react";

import { MEMBERS } from "#/pages/home/ui/common/members";
import { memberAuthor } from "#/pages/home/ui/message/author";
import { Message } from "#/pages/home/ui/message/message";
import type { Reply } from "#/pages/home/ui/message/message";
import { Reactions } from "#/pages/home/ui/message/reactions";

import starPhoto from "./star-photo.svg";
import { Vow } from "./vow";

const SKY = "今日の星空やばかったね";
const SKY_ALT = "キャンプ場で撮った星空の写真";
const CAMP = "来年もぜったいキャンプ行こう";
const MENTION = `@${MEMBERS.yui.name}`;
const CAMP_TIME = "22:05";
const RIVER = "次は川の近くがいい";
const VOW = "次こそカレー焦がさないって誓う";
const BURNT = "焦げたのもおいしかったよ笑";

const SKY_REACTIONS = [
  { emoji: "⭐", count: 4, by: "me" },
  { emoji: "🥹", count: 2, by: "others" },
] as const;
const CAMP_REACTIONS = [{ emoji: "🙌", count: 3, by: "others" }] as const;
const BURNT_REACTIONS = [
  { emoji: "😂", count: 3, by: "others" },
  { emoji: "🍛", count: 2, by: "me" },
] as const;
const BURNT_REPLY: Reply = { author: memberAuthor(MEMBERS.tanaka), text: VOW };

const ChatLog = (): ReactNode => (
  <div>
    <Message id="log-2202" author={memberAuthor(MEMBERS.yui)} time="22:02">
      <p>{SKY}</p>
      <img
        src={starPhoto}
        alt={SKY_ALT}
        width="320"
        height="180"
        className="mt-1 h-auto max-w-full rounded-lg"
      />
      <Reactions items={SKY_REACTIONS} />
    </Message>
    <Message id="log-2205" author={memberAuthor(MEMBERS.kenta)} time={CAMP_TIME}>
      <p>{CAMP}</p>
    </Message>
    <div className="group hover:bg-dc-hover flex items-baseline gap-4 py-0.5 pr-4 pl-4 leading-relaxed">
      <span className="text-dc-muted w-10 shrink-0 text-right text-xs opacity-0 group-hover:opacity-100">
        {CAMP_TIME}
      </span>
      <span className="bg-discord/30 text-dc-bright -mr-3 rounded-sm px-0.5 font-medium">
        {MENTION}
      </span>
      <span className="text-dc-text">{RIVER}</span>
    </div>
    <div className="pl-18">
      <Reactions items={CAMP_REACTIONS} />
    </div>
    <Vow text={VOW} />
    <Message id="log-2215" author={memberAuthor(MEMBERS.miho)} time="22:15" reply={BURNT_REPLY}>
      <p>{BURNT}</p>
      <Reactions items={BURNT_REACTIONS} />
    </Message>
  </div>
);

export { ChatLog };
