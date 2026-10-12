import type { ReactNode } from "react";

import type { ManagedGuild } from "#/features/ingest/index.server";

import { IngestPill } from "./ingest-pill";

const GuildSummary = ({ guild }: Readonly<{ guild: ManagedGuild }>): ReactNode => (
  <span className="flex min-w-0 flex-col items-start gap-2">
    <span className="text-dc-bright text-lg font-black break-words">{guild.name}</span>
    <IngestPill ingest={guild.ingest} />
  </span>
);

export { GuildSummary };
