import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { CategoryHeading } from "./category-heading";
import { rowKey } from "./sidebar-categories";
import type { SidebarCategory } from "./sidebar-categories";
import { SidebarItem } from "./sidebar-item";

export const SidebarGroup = ({ category }: Readonly<{ category: SidebarCategory }>): ReactNode => {
  if (category.state === "collapsed") {
    return <CategoryHeading name={category.name} state={category.state} />;
  }
  return (
    <div className="grid gap-0.5">
      <CategoryHeading name={category.name} state={category.state} />
      <ul className="grid gap-0.5">
        {pipe(
          category.rows,
          Array.map((row) => <SidebarItem key={rowKey(row)} row={row} />),
        )}
      </ul>
    </div>
  );
};
