import type { ReactNode } from "react";

import type { ReadableGuild } from "#/pages/settings/api/settings.server";
import { Pill } from "#/shared/ui/pill";

const CONSENT = {
  awaiting: { label: "管理者の同意待ち", tone: "bg-butter" },
  granted: { label: "さがせる", tone: "bg-mint" },
} as const;

const ReadableGuildRow = ({ guild }: Readonly<{ guild: ReadableGuild }>): ReactNode => {
  const consent = CONSENT[guild.consent];
  return (
    <li className="border-ink flex items-center justify-between gap-4 rounded-2xl border-2 px-4 py-3">
      <span className="font-bold">{guild.name}</span>
      <Pill tone={consent.tone}>{consent.label}</Pill>
    </li>
  );
};

export { ReadableGuildRow };
