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
  <div className="border-kinu grid gap-1.5 border-b py-5 md:grid-cols-4 md:gap-6 md:py-6">
    <dt className="font-mincho text-lg font-bold">{label}</dt>
    <dd className="flex flex-wrap items-baseline gap-2.5 md:col-span-3">
      {tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            "rounded-full border px-2.5 py-0.5 font-mono text-xs",
            accent && "border-shu text-shu",
            !accent && "border-sumi",
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
