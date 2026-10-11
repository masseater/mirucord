import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { ManagedGuild } from "#/features/ingest/index.server";

import { GuildIcon } from "./guild-icon";
import { Pill } from "./pill";

const CONSENT = {
  awaiting: { label: "同意待ち", tone: "bg-butter" },
  granted: { label: "取り込み中", tone: "bg-mint" },
  withdrawing: { label: "削除中", tone: "bg-pink" },
} as const;

const GuildCard = ({ guild }: Readonly<{ guild: ManagedGuild }>): ReactNode => {
  const params = useMemo(() => ({ guildId: guild.id }), [guild.id]);
  const consent = CONSENT[guild.consent];
  return (
    <li>
      <Link
        to="/dashboard/$guildId"
        params={params}
        className="bg-dc-sidebar border-dc-line hover:bg-dc-hover flex items-center justify-between gap-4 rounded-2xl border px-5 py-4 no-underline motion-safe:transition-colors"
      >
        <GuildIcon guildId={guild.id} name={guild.name} icon={guild.icon} />
        <span className="text-dc-bright grow text-lg font-black">{guild.name}</span>
        <Pill tone={consent.tone}>{consent.label}</Pill>
      </Link>
    </li>
  );
};

export { GuildCard };
