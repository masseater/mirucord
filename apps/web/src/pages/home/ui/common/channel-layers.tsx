import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

import { CHANNELS } from "./channels";
import type { Channel } from "./channels";

export const ChannelLayers = ({
  className,
  layerClassName,
  children,
}: Readonly<{
  className: string;
  layerClassName: string;
  children: (channel: Channel) => ReactNode;
}>): ReactNode => (
  <div className={className}>
    {pipe(
      CHANNELS,
      Array.map((channel) => (
        <div
          key={channel.id}
          data-channel={channel.id}
          className={cn("col-start-1 row-start-1", layerClassName)}
        >
          {children(channel)}
        </div>
      )),
    )}
  </div>
);
