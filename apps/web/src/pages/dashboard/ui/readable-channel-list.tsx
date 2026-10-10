import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";

import { ChannelLabel } from "./channel-label";
import { Pill } from "./pill";

const ReadableChannelList = ({
  channels,
}: Readonly<{ channels: readonly SettingsChannel[] }>): ReactNode => (
  <p className="flex flex-wrap gap-2">
    {channels.map((channel) => (
      <Pill key={channel.id} tone="bg-lavender">
        <ChannelLabel channel={channel} />
      </Pill>
    ))}
  </p>
);

export { ReadableChannelList };
