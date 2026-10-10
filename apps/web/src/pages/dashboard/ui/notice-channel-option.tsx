import { useCallback } from "react";
import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";

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
    <label className="flex items-center gap-2 rounded border px-3 py-2">
      <input type="radio" name={GROUP} checked={checked} onChange={choose} />
      {`#${channel.name}`}
    </label>
  );
};

export { NoticeChannelOption };
