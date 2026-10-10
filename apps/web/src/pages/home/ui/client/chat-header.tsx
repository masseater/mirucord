import type { ReactNode } from "react";

import { ChannelHeader } from "#/pages/home/ui/common/channel-header";
import { CHANNELS } from "#/pages/home/ui/common/channels";

const ChatHeader = (): ReactNode => (
  <div className="ch-bar bg-dc-chat sticky top-0 z-20 h-12">
    {CHANNELS.map((channel) => (
      <div
        key={channel.id}
        data-channel={channel.id}
        className="ch-bar-item col-start-1 row-start-1"
      >
        <ChannelHeader name={channel.name} kind={channel.kind} topic={channel.topic} />
      </div>
    ))}
  </div>
);

export { ChatHeader };
