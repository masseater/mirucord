import type { ReactNode } from "react";

import type { GuildSettings } from "#/features/ingest/index.server";
import { groupByCategory } from "#/pages/dashboard/model/channel-groups";
import { Panel } from "#/shared/ui/panel";

import { CategoryHeading } from "./category-heading";
import { IngestStatusRow } from "./ingest-status-row";

const TITLE = "取り込みの状況";
const STORED = "保存しているメッセージ";
const UNIT = "件";

const IngestStatus = ({ settings }: Readonly<{ settings: GuildSettings }>): ReactNode => (
  <Panel>
    <h2 className="text-xl font-black">{TITLE}</h2>
    <p className="font-bold">
      {STORED} {settings.storedMessages.toLocaleString("ja-JP")} {UNIT}
    </p>
    {groupByCategory(settings, settings.channels).flatMap((group) => [
      <CategoryHeading key={`heading-${group.id}`} name={group.name} />,
      <ul key={group.id} className="flex flex-col gap-1">
        {group.channels.map((channel) => (
          <IngestStatusRow key={channel.id} guildId={settings.id} channel={channel} />
        ))}
      </ul>,
    ])}
  </Panel>
);

export { IngestStatus };
