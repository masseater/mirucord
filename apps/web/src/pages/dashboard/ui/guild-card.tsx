import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { ManagedGuild } from "#/features/ingest/index.server";

import { GuildIcon } from "./guild-icon";
import { IngestPill } from "./ingest-pill";

const GuildCard = ({ guild }: Readonly<{ guild: ManagedGuild }>): ReactNode => {
  const params = useMemo(() => ({ guildId: guild.id }), [guild.id]);
  return (
    <li>
      <Link
        to="/dashboard/$guildId"
        params={params}
        className="bg-dc-sidebar border-dc-line hover:bg-dc-hover flex items-center justify-between gap-4 rounded-2xl border px-5 py-4 no-underline motion-safe:transition-colors"
      >
        <GuildIcon guildId={guild.id} name={guild.name} icon={guild.icon} />
        <span className="text-dc-bright grow text-lg font-black">{guild.name}</span>
        <IngestPill ingest={guild.ingest} />
      </Link>
    </li>
  );
};

export { GuildCard };
