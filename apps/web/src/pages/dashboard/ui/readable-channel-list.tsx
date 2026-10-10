import type { ReactNode } from "react";

import type { GuildSettings, SettingsChannel } from "#/features/ingest/index.server";
import { groupByCategory } from "#/pages/dashboard/model/channel-groups";

import { ReadableChannelGroup } from "./readable-channel-group";

const ReadableChannelList = ({
  settings,
  channels,
}: Readonly<{ settings: GuildSettings; channels: readonly SettingsChannel[] }>): ReactNode =>
  groupByCategory(settings, channels).map((group) => (
    <ReadableChannelGroup key={group.id} group={group} />
  ));

export { ReadableChannelList };
