import type { ReactNode } from "react";

import type { ChannelGroup } from "#/pages/dashboard/model/channel-groups";

import { CategoryHeading } from "./category-heading";
import { IngestStatusRow } from "./ingest-status-row";

const IngestStatusGroup = ({
  guildId,
  group,
}: Readonly<{ guildId: string; group: ChannelGroup }>): ReactNode => (
  <section className="flex flex-col gap-1">
    <CategoryHeading name={group.name} />
    <ul className="flex flex-col gap-1">
      {group.channels.map((channel) => (
        <IngestStatusRow key={channel.id} guildId={guildId} channel={channel} />
      ))}
    </ul>
  </section>
);

export { IngestStatusGroup };
