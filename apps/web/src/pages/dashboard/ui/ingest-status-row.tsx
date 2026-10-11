import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";

import { ChannelStatus } from "./channel-status";
import { ForumToggle } from "./forum-toggle";
import { PurgeChannelButton } from "./purge-channel-button";

const IngestStatusRow = ({
  guildId,
  channel,
}: Readonly<{ guildId: string; channel: SettingsChannel }>): ReactNode => (
  <li className="border-line flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b-2 border-dashed py-2 font-bold">
    {channel.kind === "forum" && <ForumToggle guildId={guildId} channel={channel} />}
    {channel.kind !== "forum" && <ChannelStatus channel={channel} />}
    {channel.ingest === "paused" && (
      <PurgeChannelButton guildId={guildId} channelId={channel.id} channelName={channel.name} />
    )}
  </li>
);

export { IngestStatusRow };
