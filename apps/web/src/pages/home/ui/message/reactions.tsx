import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

type Reaction = Readonly<{ emoji: string; count: number; by: "me" | "others" }>;

const Reactions = ({ items }: Readonly<{ items: readonly Reaction[] }>): ReactNode => (
  <ul className="mt-1 flex flex-wrap gap-1">
    {items.map((item) => (
      <li
        key={item.emoji}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-sm",
          item.by === "me" && "bg-discord/15 border-discord",
          item.by === "others" && "bg-dc-sidebar border-transparent",
        )}
      >
        <span>{item.emoji}</span>
        <span className="text-dc-text text-xs font-bold">{item.count}</span>
      </li>
    ))}
  </ul>
);

export { Reactions };
export type { Reaction };
