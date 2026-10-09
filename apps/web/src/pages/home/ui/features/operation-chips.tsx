import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const OPERATIONS = [
  { label: "検索", allowed: true },
  { label: "閲覧", allowed: true },
  { label: "投稿", allowed: false },
  { label: "削除", allowed: false },
  { label: "編集", allowed: false },
] as const;

const OperationChips = (): ReactNode => (
  <ul className="flex flex-wrap gap-2.5 font-mono text-sm">
    {OPERATIONS.map((operation) => (
      <li
        key={operation.label}
        className={cn(
          "rounded-lg border border-paper px-3.5 py-2",
          !operation.allowed && "border-dashed line-through opacity-40",
        )}
      >
        {operation.label}
      </li>
    ))}
  </ul>
);

export { OperationChips };
