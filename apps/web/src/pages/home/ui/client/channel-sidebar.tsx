import type { ReactNode } from "react";

import { CATEGORIES } from "./sidebar-categories";
import { SidebarGroup } from "./sidebar-group";

const SERVER = "みんなのサーバー";
const LABEL = "チャンネル";

const ChannelSidebar = (): ReactNode => (
  <nav
    aria-label={LABEL}
    className="bg-dc-sidebar sticky top-0 hidden h-dvh w-60 shrink-0 flex-col rounded-tl-lg md:flex"
  >
    <p className="text-dc-bright border-dc-rail flex h-12 shrink-0 items-center border-b px-4 font-bold">
      {SERVER}
    </p>
    <div className="grid content-start gap-3 overflow-y-auto px-2 py-3">
      {CATEGORIES.map((category) => (
        <SidebarGroup key={category.name} category={category} />
      ))}
    </div>
  </nav>
);

export { ChannelSidebar };
