import type { ReactNode } from "react";

import type { ManagedGuild } from "#/features/ingest/index.server";

import { GuildIcon } from "./guild-icon";
import { GuildPageLink } from "./guild-page-link";
import { IngestPill } from "./ingest-pill";

const GuildCard = ({ guild }: Readonly<{ guild: ManagedGuild }>): ReactNode => (
  <li>
    <GuildPageLink
      guildId={guild.id}
      className="bg-dc-sidebar border-dc-line hover:bg-dc-hover flex items-center justify-between gap-4 rounded-2xl border px-5 py-4 no-underline motion-safe:transition-colors"
    >
      <GuildIcon guildId={guild.id} name={guild.name} icon={guild.icon} />
      <span className="text-dc-bright grow text-lg font-black">{guild.name}</span>
      <IngestPill ingest={guild.ingest} />
    </GuildPageLink>
  </li>
);

export { GuildCard };
