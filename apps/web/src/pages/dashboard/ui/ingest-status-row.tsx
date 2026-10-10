import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";

import { Pill } from "./pill";

const INGEST = {
  unreadable: { label: "Bot が見られないチャンネル", tone: "bg-milk text-ink-soft" },
  excluded: { label: "対象外", tone: "bg-milk text-ink-soft" },
  paused: { label: "Bot が見られないため停止中（30 日後に保存分を削除）", tone: "bg-pink" },
  waiting: { label: "取り込み待ち", tone: "bg-butter" },
  backfilling: { label: "過去ログを取り込み中", tone: "bg-sky" },
  done: { label: "取り込み済み", tone: "bg-mint" },
} as const;

const IngestStatusRow = ({ channel }: Readonly<{ channel: SettingsChannel }>): ReactNode => (
  <li className="border-line flex items-center justify-between gap-4 border-b-2 border-dashed py-2">
    <span className="font-bold">{`#${channel.name}`}</span>
    <Pill tone={INGEST[channel.ingest].tone}>{INGEST[channel.ingest].label}</Pill>
  </li>
);

export { IngestStatusRow };
