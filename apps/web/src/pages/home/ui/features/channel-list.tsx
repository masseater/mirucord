import type { ReactNode } from "react";

import { ChannelRow } from "./channel-row";

const CHANNELS = [
  { name: "# ざつだん", mark: "◎", visible: true },
  { name: "# げーむ部", mark: "◎", visible: true },
  { name: "# 運営だけ", mark: "×", visible: false },
] as const;

const ChannelList = (): ReactNode => (
  <ul className="grid gap-2 text-sm">
    {CHANNELS.map((channel) => (
      <ChannelRow
        key={channel.name}
        name={channel.name}
        mark={channel.mark}
        visible={channel.visible}
      />
    ))}
  </ul>
);

export { ChannelList };
