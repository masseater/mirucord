import { useCallback } from "react";
import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";

const UNREADABLE_NOTE = "（Bot が見られません）";

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
      <label className="border-ink has-checked:bg-lavender has-disabled:text-ink-soft flex cursor-pointer items-center gap-2 rounded-2xl border-2 px-3 py-2 font-bold has-disabled:cursor-not-allowed">
        <input
          className="accent-blurple size-4"
          type="checkbox"
          checked={checked}
          disabled={channel.ingest === "unreadable" && !checked}
          onChange={toggle}
        />
        {`#${channel.name}`}
        {channel.ingest === "unreadable" && UNREADABLE_NOTE}
      </label>
    </li>
  );
};

export { ChannelOption };
