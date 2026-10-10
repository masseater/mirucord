import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";
import { ChannelIcon } from "#/shared/ui/channel-icon";

const FORUM = "フォーラム";

const ChannelLabel = ({ channel }: Readonly<{ channel: SettingsChannel }>): ReactNode => (
  <span className="inline-flex items-center gap-1">
    <ChannelIcon kind={channel.kind} size="sm" />
    {channel.kind === "forum" && <span className="sr-only">{FORUM}</span>}
    {channel.name}
  </span>
);

export { ChannelLabel };
