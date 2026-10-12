import type { ReactNode } from "react";

import type { GuildSettings, SettingsChannel } from "#/features/ingest/index.server";
import { groupByCategory } from "#/pages/dashboard/model/channel-groups";
import { MASCOT_NAME } from "#/shared/config";

import { BlindChannelNote } from "./blind-channel-note";
import { CategoryHeading } from "./category-heading";
import { ChannelLabel } from "./channel-label";
import { ForumPillToggle } from "./forum-pill-toggle";
import { ForumPostPanel } from "./forum-post-panel";
import { Pill } from "./pill";

const TITLE = `${MASCOT_NAME}が見られるチャンネル`;

type Props = Readonly<{ settings: GuildSettings; channels: readonly SettingsChannel[] }>;

const ChannelGroups = ({ settings, channels }: Props): ReactNode =>
  groupByCategory(settings, channels).map((group) => {
    const pills = group.channels.map((channel) => {
      if (channel.kind === "forum") {
        return <ForumPillToggle key={channel.id} channel={channel} />;
      }
      return (
        <Pill key={channel.id} tone="bg-dc-active text-dc-text">
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

const ReadableChannelList = ({ settings, channels }: Props): ReactNode => (
  <>
    <h2 className="text-dc-bright font-maru text-xl font-black">{TITLE}</h2>
    <ChannelGroups settings={settings} channels={channels} />
    <BlindChannelNote channels={channels} />
  </>
);

export { ReadableChannelList };
