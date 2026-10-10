import type { ReactNode } from "react";

import type { Author } from "#/pages/home/ui/message/author";
import { AuthorAvatar } from "#/pages/home/ui/message/author-avatar";
import { AuthorName } from "#/pages/home/ui/message/author-name";

const MemberRow = ({ author }: Readonly<{ author: Author }>): ReactNode => (
  <li className="hover:bg-dc-hover flex items-center gap-3 rounded-sm px-2 py-1.5">
    <span className="relative">
      <AuthorAvatar author={author} size="sm" />
      <span className="bg-dc-online border-dc-sidebar absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2" />
    </span>
    <AuthorName author={author} />
  </li>
);

export { MemberRow };
