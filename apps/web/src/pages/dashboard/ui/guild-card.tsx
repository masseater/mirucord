import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { ManagedGuild } from "#/features/ingest/index.server";

const CONSENT_LABEL = {
  awaiting: "同意待ち・取り込みは止まっています",
  granted: "同意済み・取り込み中",
} as const;

const GuildCard = ({ guild }: Readonly<{ guild: ManagedGuild }>): ReactNode => {
  const params = useMemo(() => ({ guildId: guild.id }), [guild.id]);
  return (
    <li>
      <Link
        to="/dashboard/$guildId"
        params={params}
        className="flex justify-between gap-4 rounded border px-4 py-3"
      >
        <span className="font-bold">{guild.name}</span>
        <span>{CONSENT_LABEL[guild.consent]}</span>
      </Link>
    </li>
  );
};

export { GuildCard };
