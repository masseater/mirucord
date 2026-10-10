import type { ReactNode } from "react";

import type { Author } from "./author";
import { AuthorName } from "./author-name";

const MessageBody = ({
  author,
  time,
  children,
}: Readonly<{ author: Author; time: string; children: ReactNode }>): ReactNode => (
  <div className="min-w-0 grow">
    <p className="flex flex-wrap items-center gap-x-2">
      <AuthorName author={author} />
      <span className="text-dc-muted text-xs">{time}</span>
    </p>
    <div className="text-dc-text grid gap-1 leading-relaxed">{children}</div>
  </div>
);

export { MessageBody };
