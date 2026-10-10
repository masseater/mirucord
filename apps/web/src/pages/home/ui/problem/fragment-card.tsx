import type { ReactNode } from "react";

import type { Member } from "#/pages/home/ui/common/members";
import { cn } from "#/shared/lib/utils";

const FragmentCard = ({
  children,
  member,
  text,
  className,
}: Readonly<{
  children?: ReactNode;
  member: Member;
  text: string;
  className: string;
}>): ReactNode => (
  <li
    className={cn(
      "bg-dc-sidebar border-dc-line grid gap-1 rounded-lg border px-3 py-2 text-sm",
      className,
    )}
  >
    {children}
    <span className={cn("font-bold", member.tone)}>{member.name}</span>
    <span className="text-dc-text">{text}</span>
  </li>
);

export { FragmentCard };
