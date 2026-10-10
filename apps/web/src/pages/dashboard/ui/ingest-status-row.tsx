import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";

import { ChannelLabel } from "./channel-label";
import { Pill } from "./pill";
import { PurgeChannelButton } from "./purge-channel-button";

const INGEST = {
  unreadable: { label: "Bot が見られないチャンネル", tone: "bg-milk text-ink-soft" },
  awaiting: { label: "同意待ち", tone: "bg-milk text-ink-soft" },
  paused: { label: "Bot が見られないため停止中（30 日後に保存分を削除）", tone: "bg-pink" },
  cleared: { label: "Bot が見られないため停止中（保存分は削除済み）", tone: "bg-milk" },
  waiting: { label: "取り込み待ち", tone: "bg-butter" },
  backfilling: { label: "過去ログを取り込み中", tone: "bg-sky" },
  done: { label: "取り込み済み", tone: "bg-mint" },
} as const;

const POSTS = "投稿";
const UNIT = "件";

const IngestStatusRow = ({
  guildId,
  channel,
}: Readonly<{ guildId: string; channel: SettingsChannel }>): ReactNode => (
  <li className="border-line flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b-2 border-dashed py-2">
    <span className="flex flex-wrap items-baseline gap-x-2 font-bold">
      <ChannelLabel channel={channel} />
      {channel.kind === "forum" && (
        <span className="text-ink-soft text-sm">
          {POSTS} {channel.posts.toLocaleString("ja-JP")} {UNIT}
        </span>
      )}
    </span>
    <Pill tone={INGEST[channel.ingest].tone}>{INGEST[channel.ingest].label}</Pill>
    {channel.ingest === "paused" && (
      <PurgeChannelButton guildId={guildId} channelId={channel.id} channelName={channel.name} />
    )}
  </li>
);

export { IngestStatusRow };
