import { useCallback } from "react";
import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";

const ChannelOption = ({
  channel,
  checked,
  onToggle,
}: Readonly<{
  channel: SettingsChannel;
  checked: boolean;
  onToggle: (channelId: string) => void;
}>): ReactNode => {
  const toggle = useCallback(() => {
    onToggle(channel.id);
  }, [channel.id, onToggle]);
  return (
    <li>
      <label className="border-ink has-checked:bg-lavender flex cursor-pointer items-center gap-2 rounded-2xl border-2 px-3 py-2 font-bold">
        <input
          className="accent-blurple size-4"
          type="checkbox"
          checked={checked}
          onChange={toggle}
        />
        {`#${channel.name}`}
      </label>
    </li>
  );
};

export { ChannelOption };
