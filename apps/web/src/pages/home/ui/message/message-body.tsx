import type { ReactNode } from "react";

import type { Author } from "./author";
import { MessageMeta } from "./message-meta";

const MessageBody = ({
  author,
  time,
  children,
}: Readonly<{ author: Author; time: string; children: ReactNode }>): ReactNode => (
  <div className="min-w-0 grow">
    <MessageMeta author={author} time={time} />
    <div className="text-dc-text grid gap-1 leading-relaxed">{children}</div>
  </div>
);

export { MessageBody };
