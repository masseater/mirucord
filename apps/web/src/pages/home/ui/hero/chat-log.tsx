import type { ReactNode } from "react";

import { ChatMessage } from "./chat-message";

const CHANNEL = "# ざつだん";
const DATE = "2024年8月12日";

const MESSAGES = [
  {
    initial: "ゆ",
    avatar: "bg-pink-deep",
    name: "ゆい",
    time: "22:02",
    body: "今日の星空やばかったね",
    marked: false,
  },
  {
    initial: "け",
    avatar: "bg-mint-deep",
    name: "kenta",
    time: "22:05",
    body: "来年もぜったいキャンプ行こう",
    marked: false,
  },
  {
    initial: "た",
    avatar: "bg-sky-deep",
    name: "たなか",
    time: "22:14",
    body: "次こそカレー焦がさないって誓う",
    marked: true,
  },
  {
    initial: "み",
    avatar: "bg-butter-deep",
    name: "みほ",
    time: "22:15",
    body: "焦げたのもおいしかったよ笑",
    marked: false,
  },
] as const;

const ChatLog = (): ReactNode => (
  <div className="border-ink bg-milk shadow-pop relative -rotate-1 rounded-3xl border-2 px-6 pt-5 pb-8">
    <div className="border-line text-ink-soft flex justify-between border-b-2 border-dashed pb-3 text-sm font-bold">
      <span className="text-blurple">{CHANNEL}</span>
      <span>{DATE}</span>
    </div>
    <ul>
      {MESSAGES.map((message) => (
        <ChatMessage
          key={message.time}
          initial={message.initial}
          avatar={message.avatar}
          name={message.name}
          time={message.time}
          body={message.body}
          marked={message.marked}
        />
      ))}
    </ul>
  </div>
);

export { ChatLog };
