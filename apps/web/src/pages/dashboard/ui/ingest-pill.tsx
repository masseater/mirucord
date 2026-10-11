import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";

import { Pill } from "./pill";

const INGEST = {
  unreadable: { label: "ミルが見られないチャンネル", tone: "bg-dc-active text-dc-muted" },
  awaiting: { label: "同意待ち", tone: "bg-dc-active text-dc-muted" },
  paused: { label: "ミルが見られないため停止中（30 日後に保存分を削除）", tone: "bg-pink" },
  cleared: {
    label: "ミルが見られないため停止中（保存分は削除済み）",
    tone: "bg-dc-active text-dc-text",
  },
  waiting: { label: "取り込み待ち", tone: "bg-butter" },
  backfilling: { label: "過去ログを取り込み中", tone: "bg-sky" },
  done: { label: "取り込み済み", tone: "bg-mint" },
} as const;

const IngestPill = ({ ingest }: Readonly<{ ingest: SettingsChannel["ingest"] }>): ReactNode => (
  <Pill tone={INGEST[ingest].tone}>{INGEST[ingest].label}</Pill>
);

export { IngestPill };
