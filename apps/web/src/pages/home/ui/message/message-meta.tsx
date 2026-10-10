import type { ReactNode } from "react";

import type { Author } from "./author";
import { AuthorName } from "./author-name";

const MessageMeta = ({ author, time }: Readonly<{ author: Author; time: string }>): ReactNode => (
  <p className="flex flex-wrap items-center gap-x-2">
    <AuthorName author={author} />
    <span className="text-dc-muted text-xs">{time}</span>
  </p>
);

export { MessageMeta };
