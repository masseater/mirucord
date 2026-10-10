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
  <ul className="flex flex-wrap gap-2 text-sm font-bold">
    {OPERATIONS.map((operation) => (
      <li
        key={operation.label}
        className={cn(
          "bg-milk border-ink rounded-full border-2 px-4 py-1.5",
          !operation.allowed && "border-dashed line-through opacity-40",
        )}
      >
        {operation.label}
      </li>
    ))}
  </ul>
);

export { OperationChips };
