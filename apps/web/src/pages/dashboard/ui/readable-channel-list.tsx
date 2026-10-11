import type { ReactNode } from "react";

import type { GuildSettings, SettingsChannel } from "#/features/ingest/index.server";
import { groupByCategory } from "#/pages/dashboard/model/channel-groups";

import { CategoryHeading } from "./category-heading";
import { ChannelLabel } from "./channel-label";
import { ForumPillToggle } from "./forum-pill-toggle";
import { ForumPostPanel } from "./forum-post-panel";
import { Pill } from "./pill";

const ReadableChannelList = ({
  settings,
  channels,
}: Readonly<{ settings: GuildSettings; channels: readonly SettingsChannel[] }>): ReactNode =>
  groupByCategory(settings, channels).map((group) => {
    const pills = group.channels.map((channel) => {
      if (channel.kind === "forum") {
        return <ForumPillToggle key={channel.id} channel={channel} />;
      }
      return (
        <Pill key={channel.id} tone="bg-lavender">
          <ChannelLabel channel={channel} />
        </Pill>
      );
    });
    const forums = group.channels
      .filter(({ kind }) => kind === "forum")
      .map((channel) => (
        <ForumPostPanel key={channel.id} guildId={settings.id} channelId={channel.id} />
      ));
    return (
      <div key={group.id} className="flex flex-col gap-1">
        <CategoryHeading name={group.name} />
        <p className="flex flex-wrap gap-2">{pills}</p>
        {forums}
      </div>
    );
  });

export { ReadableChannelList };
