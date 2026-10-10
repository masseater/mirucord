import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

import type { Author } from "./author";
import { AuthorAvatar } from "./author-avatar";
import { AuthorName } from "./author-name";
import { MessageBody } from "./message-body";

type Reply = Readonly<{ author: Author; text: string }>;

const MENTION = "@";

const Message = ({
  id,
  author,
  time,
  variant = "plain",
  reply,
  children,
}: Readonly<{
  id?: string;
  reply?: Reply | undefined;
  author: Author;
  time: string;
  variant?: "plain" | "highlight";
  children: ReactNode;
}>): ReactNode => (
  <div
    id={id}
    className={cn(
      "relative isolate mt-2 scroll-mt-16 border-l-2 py-1.5 pr-4 pl-3.5",
      variant === "plain" && "hover:bg-dc-hover border-transparent",
      variant === "highlight" && "bg-dc-highlight border-dc-mention",
    )}
  >
    {reply && (
      <div className="relative flex items-center gap-1.5 pl-14 text-sm">
        <span className="border-dc-line absolute top-1/2 left-5 h-3 w-8 rounded-tl-md border-t-2 border-l-2" />
        <AuthorAvatar author={reply.author} size="xs" />
        <AuthorName author={reply.author} mark={MENTION} />
        <span className="text-dc-muted truncate">{reply.text}</span>
      </div>
    )}
    <div className="flex gap-4">
      <AuthorAvatar author={author} size="md" />
      <MessageBody author={author} time={time}>
        {children}
      </MessageBody>
    </div>
  </div>
);

export { Message };
export type { Reply };
