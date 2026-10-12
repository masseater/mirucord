import type { ReactNode } from "react";

import type { ManagedGuild } from "#/features/ingest/index.server";

import { GuildIcon } from "./guild-icon";
import { GuildPageLink } from "./guild-page-link";
import { GuildSummary } from "./guild-summary";

const GuildCard = ({ guild }: Readonly<{ guild: ManagedGuild }>): ReactNode => (
  <li>
    <GuildPageLink
      guildId={guild.id}
      className="bg-dc-sidebar border-dc-line hover:bg-dc-hover flex h-full items-center gap-4 rounded-2xl border px-5 py-4 no-underline motion-safe:transition-colors"
    >
      <GuildIcon guildId={guild.id} name={guild.name} icon={guild.icon} />
      <GuildSummary guild={guild} />
    </GuildPageLink>
  </li>
);

export { GuildCard };
