import type { ReactNode } from "react";

import { ChannelItems } from "./channel-items";

const SERVER = "みんなのサーバー";
const CATEGORY = "テキストチャンネル";

const ChannelSidebar = (): ReactNode => (
  <nav
    aria-label={CATEGORY}
    className="bg-dc-sidebar sticky top-0 hidden h-dvh w-60 shrink-0 flex-col rounded-tl-lg md:flex"
  >
    <p className="text-dc-bright border-dc-rail flex h-12 items-center border-b px-4 font-bold">
      {SERVER}
    </p>
    <p className="text-dc-muted px-4 pt-5 pb-1 text-xs font-bold">{CATEGORY}</p>
    <ChannelItems className="grid px-2" />
  </nav>
);

export { ChannelSidebar };
