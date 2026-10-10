import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";

import { NoticeChannelOption } from "./notice-channel-option";

const LEGEND = "お知らせを投稿するチャンネル";

const NoticeChannelPicker = ({
  channels,
  value,
  onChoose,
}: Readonly<{
  channels: readonly SettingsChannel[];
  value: string;
  onChoose: (channelId: string) => void;
}>): ReactNode => (
  <fieldset className="flex flex-col gap-2">
    <legend className="mb-2 font-black">{LEGEND}</legend>
    <div className="grid gap-2 sm:grid-cols-2">
      {channels
        .filter(({ ingest }) => ingest !== "unreadable")
        .map((channel) => (
          <NoticeChannelOption
            key={channel.id}
            channel={channel}
            checked={channel.id === value}
            onChoose={onChoose}
          />
        ))}
    </div>
  </fieldset>
);

export { NoticeChannelPicker };
