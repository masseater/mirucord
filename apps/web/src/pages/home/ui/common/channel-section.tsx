import type { ReactNode } from "react";

import { ChannelHeader } from "./channel-header.tsx";
import type { Channel } from "./channels.ts";

export const ChannelSection = ({
  channel,
  children,
}: Readonly<{ channel: Channel; children: ReactNode }>): ReactNode => (
  <section id={channel.id} className="ch-section">
    <div className="ch-pane pb-10">
      <ChannelHeader channel={channel} />
      {children}
    </div>
  </section>
);
