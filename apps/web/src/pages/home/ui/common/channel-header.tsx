import type { ReactNode } from "react";

import { ChannelIcon } from "#/shared/ui/channel-icon";

import type { Channel } from "./channels.ts";

export const ChannelHeader = ({ channel }: Readonly<{ channel: Channel }>): ReactNode => (
  <div className="ch-head bg-dc-chat border-dc-rail sticky z-10 flex h-12 items-center gap-2 border-b px-4">
    <span className="text-dc-muted">
      <ChannelIcon kind={channel.kind} size="lg" />
    </span>
    <span className="text-dc-bright font-bold">{channel.name}</span>
    {channel.topic !== "" && (
      <span className="text-dc-muted border-dc-line ml-2 hidden truncate border-l pl-3 text-sm sm:block">
        {channel.topic}
      </span>
    )}
  </div>
);
