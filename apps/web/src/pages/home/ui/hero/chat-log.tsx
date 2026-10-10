import type { ReactNode } from "react";

import { ChatMessage } from "./chat-message";

const CHANNEL = "# 開発";
const DATE = "3月12日";

const MESSAGES = [
  {
    initial: "佐",
    avatar: "bg-pink-deep",
    name: "佐藤ゆい",
    time: "21:04",
    body: "決済まわりの不具合がまだ残ってます",
    marked: false,
  },
  {
    initial: "健",
    avatar: "bg-mint-deep",
    name: "kenta",
    time: "21:06",
    body: "今の状態で出すのは怖いですね",
    marked: false,
  },
  {
    initial: "田",
    avatar: "bg-sky-deep",
    name: "田中",
    time: "21:11",
    body: "リリースは 3/21 に延期で確定します",
    marked: true,
  },
  {
    initial: "美",
    avatar: "bg-butter-deep",
    name: "みほ",
    time: "21:12",
    body: "了解です 告知文を直します",
    marked: false,
  },
] as const;

const ChatLog = (): ReactNode => (
  <div className="border-ink bg-milk shadow-pop relative -rotate-1 rounded-3xl border-2 px-6 pt-5 pb-8">
    <div className="border-line text-mist flex justify-between border-b-2 border-dashed pb-3 text-sm font-bold">
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
