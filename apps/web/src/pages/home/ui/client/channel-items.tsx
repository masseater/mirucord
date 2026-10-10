import type { ReactNode } from "react";

import { CHANNELS } from "#/pages/home/ui/common/channels";
import { cn } from "#/shared/lib/utils";

import { ChannelLink } from "./channel-link";

const ChannelItems = ({ className }: Readonly<{ className: string }>): ReactNode => (
  <ul className={cn("gap-0.5", className)}>
    {CHANNELS.map((channel) => (
      <li key={channel.id}>
        <ChannelLink id={channel.id} name={channel.name} kind={channel.kind} />
      </li>
    ))}
  </ul>
);

export { ChannelItems };
