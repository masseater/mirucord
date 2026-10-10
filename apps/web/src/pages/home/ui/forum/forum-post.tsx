import type { ReactNode } from "react";

import type { Member } from "#/pages/home/ui/common/members";
import { cn } from "#/shared/lib/utils";

import { ForumTag } from "./forum-tag";

const REPLIES = "💬";
const REPLIES_LABEL = "返信";
const READ = "ミルがよんだよ";

const ForumPost = ({
  tags,
  title,
  member,
  preview,
  replies,
  ago,
}: Readonly<{
  tags: readonly Readonly<{ emoji: string; label: string }>[];
  title: string;
  member: Member;
  preview: string;
  replies: number;
  ago: string;
}>): ReactNode => (
  <li className="forum-post bg-dc-sidebar hover:bg-dc-hover relative grid gap-1.5 rounded-lg px-4 py-3">
    <p className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <ForumTag key={tag.label} emoji={tag.emoji} label={tag.label} />
      ))}
    </p>
    <h3 className="text-dc-bright font-bold">{title}</h3>
    <p className="flex min-w-0 gap-1 text-sm">
      <span className={cn("shrink-0 font-bold", member.tone)}>{member.name}</span>
      <span className="text-dc-muted truncate">{preview}</span>
    </p>
    <p className="text-dc-muted flex gap-1 text-xs">
      <span aria-hidden="true">{REPLIES}</span>
      <span className="sr-only">{REPLIES_LABEL}</span>
      <span>{replies}</span>
      <span className="ml-2">{ago}</span>
    </p>
    <span
      aria-hidden="true"
      className="forum-read bg-lavender-deep text-ink absolute top-3 right-4 rounded-full px-2 py-0.5 text-xs font-bold"
    >
      {READ}
    </span>
  </li>
);

export { ForumPost };
