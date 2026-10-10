import type { ReactNode } from "react";

import type { GuildSettings, SettingsChannel } from "#/features/ingest/index.server";
import { groupByCategory } from "#/pages/dashboard/model/channel-groups";

import { CategoryHeading } from "./category-heading";
import { ChannelLabel } from "./channel-label";
import { Pill } from "./pill";

const ReadableChannelList = ({
  settings,
  channels,
}: Readonly<{ settings: GuildSettings; channels: readonly SettingsChannel[] }>): ReactNode =>
  groupByCategory(settings, channels).map((group) => {
    const pills = group.channels.map((channel) => (
      <Pill key={channel.id} tone="bg-lavender">
        <ChannelLabel channel={channel} />
      </Pill>
    ));
    return (
      <div key={group.id} className="flex flex-col gap-1">
        <CategoryHeading name={group.name} />
        <p className="flex flex-wrap gap-2">{pills}</p>
      </div>
    );
  });

export { ReadableChannelList };
