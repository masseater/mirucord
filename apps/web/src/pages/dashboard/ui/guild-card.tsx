import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { ManagedGuild } from "#/features/ingest/index.server";
import { cn } from "#/shared/lib/utils";

const CONSENT = {
  awaiting: { label: "同意待ち", tone: "bg-butter" },
  granted: { label: "取り込み中", tone: "bg-mint" },
} as const;

const GuildCard = ({ guild }: Readonly<{ guild: ManagedGuild }>): ReactNode => {
  const params = useMemo(() => ({ guildId: guild.id }), [guild.id]);
  const consent = CONSENT[guild.consent];
  return (
    <li>
      <Link
        to="/dashboard/$guildId"
        params={params}
        className="border-ink bg-milk shadow-pop-sm flex items-center justify-between gap-4 rounded-3xl border-2 px-5 py-4 no-underline transition-all hover:-translate-y-0.5"
      >
        <span className="text-lg font-black">{guild.name}</span>
        <span
          className={cn(
            "border-ink rounded-full border-2 px-3 py-0.5 text-xs font-bold",
            consent.tone,
          )}
        >
          {consent.label}
        </span>
      </Link>
    </li>
  );
};

export { GuildCard };
