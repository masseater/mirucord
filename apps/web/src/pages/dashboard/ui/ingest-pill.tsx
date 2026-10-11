import type { ReactNode } from "react";

import type { GuildIngest, SettingsChannel } from "#/features/ingest/index.server";

import { Pill } from "./pill";

const INGEST = {
  unreadable: { label: "ミルが見られないチャンネル", tone: "bg-milk text-ink-soft" },
  awaiting: { label: "同意待ち", tone: "bg-butter" },
  withdrawing: { label: "削除中", tone: "bg-pink" },
  paused: { label: "ミルが見られないため停止中（30 日後に保存分を削除）", tone: "bg-pink" },
  cleared: { label: "ミルが見られないため停止中（保存分は削除済み）", tone: "bg-milk" },
  waiting: { label: "取り込み待ち", tone: "bg-milk text-ink-soft" },
  backfilling: { label: "取り込み中", tone: "bg-sky" },
  done: { label: "取り込み済み", tone: "bg-mint" },
} as const;

const IngestPill = ({
  ingest,
}: Readonly<{ ingest: SettingsChannel["ingest"] | GuildIngest }>): ReactNode => (
  <Pill tone={INGEST[ingest].tone}>{INGEST[ingest].label}</Pill>
);

export { IngestPill };
