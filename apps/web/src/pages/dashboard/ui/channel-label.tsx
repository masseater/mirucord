import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";
import { ChannelIcon } from "#/shared/ui/channel-icon";

const KIND_LABEL = {
  text: "",
  announcement: "アナウンス",
  voice: "ボイス",
  stage: "ステージ",
  forum: "フォーラム",
} as const;

const ChannelLabel = ({ channel }: Readonly<{ channel: SettingsChannel }>): ReactNode => (
  <span className="inline-flex items-center gap-1">
    <ChannelIcon kind={channel.kind} size="sm" />
    {channel.kind !== "text" && <span className="sr-only">{KIND_LABEL[channel.kind]}</span>}
    {channel.name}
  </span>
);

export { ChannelLabel };
