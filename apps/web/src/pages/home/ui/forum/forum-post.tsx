import type { ReactNode } from "react";

import type { Member } from "#/pages/home/ui/common/members";
import { cn } from "#/shared/lib/utils";

const REPLIES = "💬";

const ForumPost = ({
  tags,
  title,
  member,
  preview,
  replies,
  ago,
}: Readonly<{
  tags: readonly string[];
  title: string;
  member: Member;
  preview: string;
  replies: number;
  ago: string;
}>): ReactNode => (
  <li className="bg-dc-sidebar hover:bg-dc-hover grid gap-1.5 rounded-lg px-4 py-3">
    <p className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span key={tag} className="bg-dc-active text-dc-text rounded-full px-2 text-xs font-bold">
          {tag}
        </span>
      ))}
    </p>
    <h3 className="text-dc-bright font-bold">{title}</h3>
    <p className="flex min-w-0 gap-1 text-sm">
      <span className={cn("shrink-0 font-bold", member.tone)}>{member.name}</span>
      <span className="text-dc-muted truncate">{preview}</span>
    </p>
    <p className="text-dc-muted flex gap-3 text-xs">
      <span>
        {REPLIES} {replies}
      </span>
      <span>{ago}</span>
    </p>
  </li>
);

export { ForumPost };
