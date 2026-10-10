import type { ReactNode } from "react";

import { MEMBERS } from "#/pages/home/ui/common/members";
import { memberAuthor } from "#/pages/home/ui/message/author";
import { Message } from "#/pages/home/ui/message/message";

import { MEMORY_ID } from "./memory";

const MESSAGES = [
  {
    anchor: "log-2202",
    member: MEMBERS.yui,
    time: "22:02",
    body: "今日の星空やばかったね",
    variant: "plain",
  },
  {
    anchor: "log-2205",
    member: MEMBERS.kenta,
    time: "22:05",
    body: "来年もぜったいキャンプ行こう",
    variant: "plain",
  },
  {
    anchor: MEMORY_ID,
    member: MEMBERS.tanaka,
    time: "22:14",
    body: "次こそカレー焦がさないって誓う",
    variant: "highlight",
  },
  {
    anchor: "log-2215",
    member: MEMBERS.miho,
    time: "22:15",
    body: "焦げたのもおいしかったよ笑",
    variant: "plain",
  },
] as const;

const ChatLog = (): ReactNode => (
  <div>
    {MESSAGES.map((message) => (
      <Message
        key={message.anchor}
        id={message.anchor}
        author={memberAuthor(message.member)}
        time={message.time}
        variant={message.variant}
      >
        <p>{message.body}</p>
      </Message>
    ))}
  </div>
);

export { ChatLog };
