import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";

const INGEST_LABEL = {
  excluded: "対象外",
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
