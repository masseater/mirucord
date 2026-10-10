import type { ReactNode } from "react";

import { CategoryHeading } from "./category-heading";
import type { SidebarCategory } from "./sidebar-categories";
import { SidebarRows } from "./sidebar-rows";

const SidebarGroup = ({ category }: Readonly<{ category: SidebarCategory }>): ReactNode => {
  if (category.state === "collapsed") {
    return <CategoryHeading name={category.name} state={category.state} />;
  }
  return (
    <div className="grid gap-0.5">
      <CategoryHeading name={category.name} state={category.state} />
      <SidebarRows rows={category.rows} />
    </div>
  );
};

export { SidebarGroup };
