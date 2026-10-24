import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import type { GuildSettings } from "#/features/ingest/index.server";
import { groupByCategory } from "#/pages/dashboard/model/channel-groups";
import { countFormat } from "#/pages/dashboard/model/format";
import { Panel } from "#/shared/ui/panel";

import { CategoryHeading } from "./category-heading";
import { IngestPill } from "./ingest-pill";
import { IngestStatusRow } from "./ingest-status-row";

const TITLE = "取り込みの状況";
const STORED = "思い出";
const UNIT = "件";

const IngestStatus = ({ settings }: Readonly<{ settings: GuildSettings }>): ReactNode => (
  <Panel>
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-dc-bright font-maru text-xl font-black">{TITLE}</h2>
      <IngestPill ingest={settings.ingest} />
    </div>
    <p className="font-bold">
      {STORED} {countFormat.format(settings.storedMessages)} {UNIT}
    </p>
    {pipe(
      groupByCategory(settings, settings.channels),
      Array.map((group) => {
        const rows = pipe(
          group.channels,
          Array.map((channel) => (
            <IngestStatusRow key={channel.id} guildId={settings.id} channel={channel} />
          )),
        );
        return (
          <div key={group.id} className="flex flex-col gap-1">
            <CategoryHeading name={group.name} />
            <ul className="flex flex-col gap-1">{rows}</ul>
          </div>
        );
      }),
    )}
  </Panel>
);

export { IngestStatus };
