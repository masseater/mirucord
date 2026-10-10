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
      <label className="flex items-center gap-2 rounded border px-3 py-2">
        <input type="checkbox" checked={checked} onChange={toggle} />
        {`#${channel.name}`}
      </label>
    </li>
  );
};

export { ChannelOption };
