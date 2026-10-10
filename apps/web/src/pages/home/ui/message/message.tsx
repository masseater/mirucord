import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

import type { Author } from "./author";
import { AuthorAvatar } from "./author-avatar";
import { MessageBody } from "./message-body";

const Message = ({
  id,
  author,
  time,
  variant = "plain",
  children,
}: Readonly<{
  id?: string;
  author: Author;
  time: string;
  variant?: "plain" | "highlight";
  children: ReactNode;
}>): ReactNode => (
  <div
    id={id}
    className={cn(
      "mt-2 flex scroll-mt-16 gap-4 border-l-2 py-1.5 pr-4 pl-3.5",
      variant === "plain" && "hover:bg-dc-hover border-transparent",
      variant === "highlight" && "bg-dc-highlight border-dc-mention",
    )}
  >
    <AuthorAvatar author={author} size="md" />
    <MessageBody author={author} time={time}>
      {children}
    </MessageBody>
  </div>
);

export { Message };
