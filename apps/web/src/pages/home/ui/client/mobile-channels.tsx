import type { ReactNode } from "react";

import { ChannelItems } from "./channel-items";

const LABEL = "チャンネル";

const MobileChannels = (): ReactNode => (
  <nav aria-label={LABEL} className="bg-dc-sidebar overflow-x-auto px-2 py-1.5 text-sm md:hidden">
    <ChannelItems className="flex w-max" />
  </nav>
);

export { MobileChannels };
