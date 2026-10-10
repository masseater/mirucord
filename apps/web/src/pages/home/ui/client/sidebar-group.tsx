import type { ReactNode } from "react";

import { CategoryHeading } from "./category-heading";
import type { SidebarCategory, SidebarRow } from "./sidebar-categories";
import { SidebarItem } from "./sidebar-item";

const rowKey = (row: SidebarRow): string => {
  if (row.type === "link") {
    return row.channel.id;
  }
  if (row.type === "peek") {
    return row.id;
  }
  return row.place.name;
};

const SidebarGroup = ({ category }: Readonly<{ category: SidebarCategory }>): ReactNode => {
  if (category.state === "collapsed") {
    return <CategoryHeading name={category.name} state={category.state} />;
  }
  return (
    <div className="grid gap-0.5">
      <CategoryHeading name={category.name} state={category.state} />
      <ul className="grid gap-0.5">
        {category.rows.map((row) => (
          <SidebarItem key={rowKey(row)} row={row} />
        ))}
      </ul>
    </div>
  );
};

export { SidebarGroup };
