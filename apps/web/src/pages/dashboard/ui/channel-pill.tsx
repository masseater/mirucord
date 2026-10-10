import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";

import { ChannelLabel } from "./channel-label";
import { Pill } from "./pill";

const ChannelPill = ({ channel }: Readonly<{ channel: SettingsChannel }>): ReactNode => (
  <Pill tone="bg-lavender">
    <ChannelLabel channel={channel} />
  </Pill>
);

export { ChannelPill };
