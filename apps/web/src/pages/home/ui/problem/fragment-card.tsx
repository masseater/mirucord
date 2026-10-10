import type { ReactNode } from "react";

import type { Member } from "#/pages/home/ui/common/members";
import { cn } from "#/shared/lib/utils";

const FragmentCard = ({
  place,
  member,
  text,
}: Readonly<{ place: string; member: Member; text: string }>): ReactNode => (
  <li className="scene-frag bg-dc-sidebar border-dc-line grid gap-1 rounded-lg border px-3 py-2 text-sm">
    <span className="text-dc-muted text-xs font-bold">{place}</span>
    <span className={cn("font-bold", member.tone)}>{member.name}</span>
    <span className="text-dc-text">{text}</span>
  </li>
);

export { FragmentCard };
