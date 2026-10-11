import type { ReactNode } from "react";

import type { GuildIngest, SettingsChannel } from "#/features/ingest/index.server";
import { MASCOT_NAME } from "#/shared/config";

import { Pill } from "./pill";

const INGEST = {
  unreadable: { label: `${MASCOT_NAME}が見られないチャンネル`, tone: "bg-dc-active text-dc-muted" },
  awaiting: { label: "同意待ち", tone: "bg-dc-active text-dc-muted" },
  withdrawing: { label: "削除中", tone: "bg-pink" },
  paused: {
    label: `${MASCOT_NAME}が見られないため停止中（30 日後に保存分を削除）`,
    tone: "bg-pink",
  },
  cleared: {
    label: `${MASCOT_NAME}が見られないため停止中（保存分は削除済み）`,
    tone: "bg-dc-active text-dc-text",
  },
  waiting: { label: "取り込み待ち", tone: "bg-butter" },
  backfilling: { label: "取り込み中", tone: "bg-sky" },
  done: { label: "取り込み済み", tone: "bg-mint" },
} as const;

const IngestPill = ({
  ingest,
}: Readonly<{ ingest: SettingsChannel["ingest"] | GuildIngest }>): ReactNode => (
  <Pill tone={INGEST[ingest].tone}>{INGEST[ingest].label}</Pill>
);

export { IngestPill };
