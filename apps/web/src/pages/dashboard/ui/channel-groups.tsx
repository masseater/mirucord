import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import type { GuildSettings, SettingsChannel } from "#/features/ingest/index.server";
import { groupByCategory } from "#/pages/dashboard/model/channel-groups";

import { CategoryHeading } from "./category-heading";
import { ChannelLabel } from "./channel-label";
import { ForumPillToggle } from "./forum-pill-toggle";
import { ForumPostPanel } from "./forum-post-panel";
import { Pill } from "./pill";

type Props = Readonly<{ settings: GuildSettings; channels: readonly SettingsChannel[] }>;

const ChannelGroups = ({ settings, channels }: Props): ReactNode =>
  pipe(
    groupByCategory(settings, channels),
    Array.map((group) => {
      const pills = pipe(
        group.channels,
        Array.map((channel) => {
          if (channel.kind === "forum") {
            return <ForumPillToggle key={channel.id} channel={channel} />;
          }
          return (
            <Pill key={channel.id} tone="bg-dc-active text-dc-text">
              <ChannelLabel channel={channel} />
            </Pill>
          );
        }),
      );
      const forums = pipe(
        group.channels,
        Array.filter(({ kind }) => kind === "forum"),
        Array.map((channel) => (
          <ForumPostPanel key={channel.id} guildId={settings.id} channelId={channel.id} />
        )),
      );
      return (
        <div key={group.id} className="flex flex-col gap-1">
          <CategoryHeading name={group.name} />
          <p className="flex flex-wrap gap-2">{pills}</p>
          {forums}
        </div>
      );
    }),
  );

export { ChannelGroups };
