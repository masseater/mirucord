import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const SpecField = ({
  label,
  tags,
  accent,
  detail,
}: Readonly<{
  label: string;
  tags: readonly string[];
  accent: boolean;
  detail: string;
}>): ReactNode => (
  <div className="grid content-start gap-1">
    <dt className="text-dc-bright text-sm font-bold">{label}</dt>
    <dd className="flex flex-wrap items-center gap-1.5 text-sm leading-relaxed">
      {tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            "rounded-sm px-1.5 text-xs font-bold",
            accent && "bg-pink text-ink",
            !accent && "bg-dc-active text-dc-bright",
          )}
        >
          {tag}
        </span>
      ))}
      {detail}
    </dd>
  </div>
);

export { SpecField };
