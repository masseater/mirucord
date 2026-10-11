import type { ReactNode } from "react";

import type { ReadableGuild } from "#/pages/dashboard/api/dashboard.server";

import { GuildIcon } from "./guild-icon";

const ReadableGuildRow = ({ guild }: Readonly<{ guild: ReadableGuild }>): ReactNode => (
  <li className="border-ink flex items-center gap-4 rounded-2xl border-2 px-4 py-3">
    <GuildIcon guildId={guild.id} name={guild.name} icon={guild.icon} />
    <span className="font-bold">{guild.name}</span>
  </li>
);

export { ReadableGuildRow };
