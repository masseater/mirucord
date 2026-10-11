import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";

import { ChannelLabel } from "./channel-label";
import { IngestPill } from "./ingest-pill";

const ChannelStatus = ({ channel }: Readonly<{ channel: SettingsChannel }>): ReactNode => (
  <>
    <ChannelLabel channel={channel} />
    <IngestPill ingest={channel.ingest} />
  </>
);

export { ChannelStatus };
