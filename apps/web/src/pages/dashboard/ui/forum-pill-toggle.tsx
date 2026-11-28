import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest-messages/index.server";

import { ChannelLabel } from "./channel-label.tsx";
import { ForumDisclosureButton } from "./forum-disclosure-button.tsx";

export const ForumPillToggle = ({ channel }: Readonly<{ channel: SettingsChannel }>): ReactNode => (
  <ForumDisclosureButton
    channelId={channel.id}
    className="bg-dc-active text-dc-text hover:bg-dc-line inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold"
  >
    <ChannelLabel channel={channel} />
  </ForumDisclosureButton>
);
