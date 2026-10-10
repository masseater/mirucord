import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const SpecRow = ({
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
  <div className="border-line bg-milk flex flex-col gap-3 rounded-3xl border-2 p-6">
    <dt className="text-lg font-black">{label}</dt>
    <dd className="flex flex-wrap items-center gap-2 text-sm leading-relaxed">
      {tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            "rounded-full px-3 py-0.5 text-xs font-bold",
            accent && "bg-pink",
            !accent && "bg-lavender",
          )}
        >
          {tag}
        </span>
      ))}
      {detail}
    </dd>
  </div>
);

export { SpecRow };
