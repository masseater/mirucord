import type { ReactNode } from "react";

const ForumTag = ({ emoji, label }: Readonly<{ emoji: string; label: string }>): ReactNode => (
  <span className="bg-dc-active text-dc-text flex gap-1 rounded-full px-2 text-xs font-bold">
    <span aria-hidden="true">{emoji}</span>
    {label}
  </span>
);

export { ForumTag };
