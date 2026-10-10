import { useCallback } from "react";
import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";

import { ChannelLabel } from "./channel-label";

const GROUP = "notice-channel";

const NoticeChannelOption = ({
  channel,
  checked,
  onChoose,
}: Readonly<{
  channel: SettingsChannel;
  checked: boolean;
  onChoose: (channelId: string) => void;
}>): ReactNode => {
  const choose = useCallback(() => {
    onChoose(channel.id);
  }, [channel.id, onChoose]);
  return (
    <label className="border-ink has-checked:bg-lavender flex cursor-pointer items-center gap-2 rounded-full border-2 px-4 py-2 font-bold">
      <input
        className="accent-grape size-4"
        type="radio"
        name={GROUP}
        checked={checked}
        onChange={choose}
      />
      <ChannelLabel channel={channel} />
    </label>
  );
};

export { NoticeChannelOption };
