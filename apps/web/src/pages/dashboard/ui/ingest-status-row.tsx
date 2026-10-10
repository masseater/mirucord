import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";
import { cn } from "#/shared/lib/utils";

const INGEST = {
  excluded: { label: "対象外", tone: "bg-milk text-mist" },
  waiting: { label: "取り込み待ち", tone: "bg-butter" },
  backfilling: { label: "過去ログを取り込み中", tone: "bg-sky" },
  done: { label: "取り込み済み", tone: "bg-mint" },
} as const;

const IngestStatusRow = ({ channel }: Readonly<{ channel: SettingsChannel }>): ReactNode => (
  <li className="border-line flex items-center justify-between gap-4 border-b-2 border-dashed py-2">
    <span className="font-bold">{`#${channel.name}`}</span>
    <span
      className={cn(
        "border-ink rounded-full border-2 px-3 py-0.5 text-xs font-bold",
        INGEST[channel.ingest].tone,
      )}
    >
      {INGEST[channel.ingest].label}
    </span>
  </li>
);

export { IngestStatusRow };
