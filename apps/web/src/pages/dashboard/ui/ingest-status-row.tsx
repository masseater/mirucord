import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";

import { ChannelLabel } from "./channel-label";
import { ForumToggle } from "./forum-toggle";
import { IngestPill } from "./ingest-pill";
import { PurgeChannelButton } from "./purge-channel-button";

const IngestStatusRow = ({
  guildId,
  channel,
}: Readonly<{ guildId: string; channel: SettingsChannel }>): ReactNode => (
  <li className="border-dc-line flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-dashed py-2 font-bold">
    {channel.kind === "forum" && <ForumToggle guildId={guildId} channel={channel} />}
    {channel.kind !== "forum" && (
      <>
        <ChannelLabel channel={channel} />
        <IngestPill ingest={channel.ingest} />
      </>
    )}
    {channel.ingest === "paused" && (
      <PurgeChannelButton guildId={guildId} channelId={channel.id} channelName={channel.name} />
    )}
  </li>
);

export { IngestStatusRow };
