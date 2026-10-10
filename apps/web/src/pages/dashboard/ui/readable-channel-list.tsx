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
  groupByCategory(settings, channels).flatMap((group) => [
    <CategoryHeading key={`heading-${group.id}`} name={group.name} />,
    <p key={group.id} className="flex flex-wrap gap-2">
      {group.channels.map((channel) => (
        <Pill key={channel.id} tone="bg-lavender">
          <ChannelLabel channel={channel} />
        </Pill>
      ))}
    </p>,
  ]);

export { ReadableChannelList };
