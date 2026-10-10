import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";

import { PurgeChannelButton } from "./purge-channel-button";

const INGEST_LABEL = {
  unreadable: "Bot が見られないチャンネル",
  excluded: "対象外",
  paused: "Bot が見られないため停止中（30 日後に保存分を削除）",
  cleared: "Bot が見られないため停止中（保存分は削除済み）",
  waiting: "取り込み待ち",
  backfilling: "過去ログを取り込み中",
  done: "取り込み済み",
} as const;

const IngestStatusRow = ({
  guildId,
  channel,
}: Readonly<{ guildId: string; channel: SettingsChannel }>): ReactNode => (
  <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b py-1">
    <span>{`#${channel.name}`}</span>
    <span>{INGEST_LABEL[channel.ingest]}</span>
    {channel.ingest === "paused" && <PurgeChannelButton guildId={guildId} channelId={channel.id} />}
  </li>
);

export { IngestStatusRow };
