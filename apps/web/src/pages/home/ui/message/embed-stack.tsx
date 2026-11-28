import { Array, pipe } from "effect";
import type { HTMLElementType, ReactNode } from "react";

import { Embed } from "./embed.tsx";

export type EmbedItem = Readonly<{ accent: string; title: string; body: ReactNode }>;

export const EmbedStack = ({
  tag: List,
  items,
}: Readonly<{
  tag: Extract<HTMLElementType, "ol" | "ul">;
  items: readonly EmbedItem[];
}>): ReactNode => (
  <List className="grid gap-2">
    {pipe(
      items,
      Array.map((item) => (
        <li key={item.title}>
          <Embed accent={item.accent} title={item.title}>
            {item.body}
          </Embed>
        </li>
      )),
    )}
  </List>
);
