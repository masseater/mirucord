import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

import { ChannelLink } from "./channel-link";
import { CHANNELS } from "./channels";

const ChannelItems = ({ className }: Readonly<{ className: string }>): ReactNode => (
  <ul className={cn("gap-0.5", className)}>
    {CHANNELS.map((channel) => (
      <li key={channel.id}>
        <ChannelLink id={channel.id} name={channel.name} />
      </li>
    ))}
  </ul>
);

export { ChannelItems };
