import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { Embed } from "./embed";

export type EmbedItem = Readonly<{ accent: string; title: string; body: ReactNode }>;

export const EmbedStack = ({
  tag: List,
  items,
}: Readonly<{ tag: "ol" | "ul"; items: readonly EmbedItem[] }>): ReactNode => (
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
