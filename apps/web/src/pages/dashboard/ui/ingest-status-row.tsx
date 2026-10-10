import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";

const INGEST_LABEL = {
  unreadable: "Bot が見られないチャンネル",
  excluded: "対象外",
  paused: "Bot が見られないため停止中（30 日後に保存分を削除）",
  waiting: "取り込み待ち",
  backfilling: "過去ログを取り込み中",
  done: "取り込み済み",
} as const;

const IngestStatusRow = ({ channel }: Readonly<{ channel: SettingsChannel }>): ReactNode => (
  <li className="flex justify-between gap-4 border-b py-1">
    <span>{`#${channel.name}`}</span>
    <span>{INGEST_LABEL[channel.ingest]}</span>
  </li>
);

export { IngestStatusRow };
