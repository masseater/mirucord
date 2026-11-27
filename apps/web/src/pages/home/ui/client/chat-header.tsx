import type { ReactNode } from "react";

import { ChannelHeader } from "#/pages/home/ui/common/channel-header";
import { ChannelLayers } from "#/pages/home/ui/common/channel-layers";

export const ChatHeader = (): ReactNode => (
  <ChannelLayers className="ch-bar bg-dc-chat sticky z-20 h-12" layerClassName="ch-bar-item">
    {(channel) => <ChannelHeader channel={channel} />}
  </ChannelLayers>
);
