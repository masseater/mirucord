import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";
import { Pill } from "#/shared/ui/pill";

import { ChannelLabel } from "./channel-label";
import { ForumPillToggle } from "./forum-pill-toggle";

const ReadableChannelPill = ({ channel }: Readonly<{ channel: SettingsChannel }>): ReactNode => {
  if (channel.kind === "forum") {
    return <ForumPillToggle channel={channel} />;
  }
  return (
    <Pill tone="bg-lavender">
      <ChannelLabel channel={channel} />
    </Pill>
  );
};

export { ReadableChannelPill };
