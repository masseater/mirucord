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
        className="border-ink bg-milk shadow-pop-sm flex items-center justify-between gap-4 rounded-3xl border-2 px-5 py-4 no-underline motion-safe:transition motion-safe:hover:-translate-y-0.5"
      >
        <GuildIcon guildId={guild.id} name={guild.name} icon={guild.icon} />
        <span className="grow text-lg font-black">{guild.name}</span>
        <IngestPill ingest={guild.ingest} />
      </Link>
    </li>
  );
};

export { GuildCard };
