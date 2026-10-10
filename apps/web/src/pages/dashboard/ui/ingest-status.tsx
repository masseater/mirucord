import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";

import { IngestStatusRow } from "./ingest-status-row";

const TITLE = "取り込みの状況";
const STORED = "保存しているメッセージ";
const UNIT = "件";

const IngestStatus = ({
  channels,
  storedMessages,
}: Readonly<{ channels: readonly SettingsChannel[]; storedMessages: number }>): ReactNode => (
  <section className="flex flex-col gap-3">
    <h2 className="text-xl font-bold">{TITLE}</h2>
    <p>
      {STORED} {storedMessages.toLocaleString("ja-JP")} {UNIT}
    </p>
    <ul className="flex flex-col gap-1">
      {channels.map((channel) => (
        <IngestStatusRow key={channel.id} channel={channel} />
      ))}
    </ul>
  </section>
);

export { IngestStatus };
