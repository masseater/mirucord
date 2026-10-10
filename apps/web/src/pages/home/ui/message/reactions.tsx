import { Match } from "effect";
import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

type Reaction = Readonly<{ emoji: string; count: number; by: "me" | "others" }>;

const MINE = "、自分も押した";
const MINE_MARK = "✓";

const reactionLabel = (item: Reaction): string =>
  Match.value(item.by).pipe(
    Match.when("me", () => `${item.emoji} ${item.count}件${MINE}`),
    Match.when("others", () => `${item.emoji} ${item.count}件`),
    Match.exhaustive,
  );

const Reactions = ({ items }: Readonly<{ items: readonly Reaction[] }>): ReactNode => (
  <ul className="mt-1 flex flex-wrap gap-1">
    {items.map((item) => (
      <li
        key={item.emoji}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-sm",
          item.by === "me" && "bg-grape/25 border-lavender-deep",
          item.by === "others" && "bg-dc-sidebar border-transparent",
        )}
      >
        <span className="sr-only">{reactionLabel(item)}</span>
        <span aria-hidden="true">{item.emoji}</span>
        <span aria-hidden="true" className="text-dc-text text-xs font-bold">
          {item.count}
        </span>
        {item.by === "me" && (
          <span aria-hidden="true" className="text-dc-bright text-xs font-bold">
            {MINE_MARK}
          </span>
        )}
      </li>
    ))}
  </ul>
);

export { Reactions };
export type { Reaction };
