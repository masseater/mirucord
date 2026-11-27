import type { ReactNode } from "react";

import { ChannelLayers } from "#/pages/home/ui/common/channel-layers";

const SUFFIX = " へメッセージを送信";

export const ComposerHint = (): ReactNode => (
  <ChannelLayers className="grid min-w-0" layerClassName="composer-hint truncate">
    {(channel) => `#${channel.name}${SUFFIX}`}
  </ChannelLayers>
);
