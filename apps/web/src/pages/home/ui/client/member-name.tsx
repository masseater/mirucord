import type { ReactNode } from "react";

import type { Author } from "#/pages/home/ui/message/author";
import { AuthorName } from "#/pages/home/ui/message/author-name";

const MemberName = ({
  author,
  children,
}: Readonly<{ author: Author; children?: ReactNode }>): ReactNode => (
  <span className="grid min-w-0">
    <span className="flex items-center gap-1">
      <AuthorName author={author} />
    </span>
    <span className="text-dc-muted truncate text-xs">{children}</span>
  </span>
);

export { MemberName };
