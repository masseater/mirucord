import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

import { ChatMessageBody } from "./chat-message-body";

const ChatMessage = ({
  initial,
  avatar,
  name,
  time,
  body,
  marked,
}: Readonly<{
  initial: string;
  avatar: string;
  name: string;
  time: string;
  body: string;
  marked: boolean;
}>): ReactNode => (
  <li className="flex gap-3 py-3">
    <span
      className={cn(
        "text-milk grid size-10 shrink-0 place-items-center rounded-full text-sm font-black",
        avatar,
      )}
    >
      {initial}
    </span>
    <ChatMessageBody name={name} time={time} body={body} marked={marked} />
  </li>
);

export { ChatMessage };
