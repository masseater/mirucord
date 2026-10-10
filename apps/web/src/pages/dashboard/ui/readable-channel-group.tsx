import type { ReactNode } from "react";

import type { ChannelGroup } from "#/pages/dashboard/model/channel-groups";

import { CategoryHeading } from "./category-heading";
import { ChannelPill } from "./channel-pill";

const ReadableChannelGroup = ({ group }: Readonly<{ group: ChannelGroup }>): ReactNode => (
  <section className="flex flex-col gap-1">
    <CategoryHeading name={group.name} />
    <p className="flex flex-wrap gap-2">
      {group.channels.map((channel) => (
        <ChannelPill key={channel.id} channel={channel} />
      ))}
    </p>
  </section>
);

export { ReadableChannelGroup };
