import { Array, Match, pipe } from "effect";
import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

type Operation = Readonly<{ label: string; access: "permitted" | "forbidden" }>;

const OPERATIONS: readonly Operation[] = [
  { label: "検索", access: "permitted" },
  { label: "閲覧", access: "permitted" },
  { label: "投稿", access: "forbidden" },
  { label: "削除", access: "forbidden" },
  { label: "編集", access: "forbidden" },
];

const chipClass = pipe(
  Match.type<Operation["access"]>(),
  Match.when("permitted", () => "bg-dc-active text-dc-bright"),
  Match.when("forbidden", () => "text-dc-muted line-through"),
  Match.exhaustive,
);

const OperationChips = (): ReactNode => (
  <ul className="flex flex-wrap gap-2 text-sm font-bold">
    {pipe(
      OPERATIONS,
      Array.map((operation) => (
        <li
          key={operation.label}
          className={cn("rounded-sm px-3 py-1", chipClass(operation.access))}
        >
          {operation.label}
        </li>
      )),
    )}
  </ul>
);

export { OperationChips };
