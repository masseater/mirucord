import type { ReactNode } from "react";

import type { ReadableGuild } from "#/pages/dashboard/api/dashboard.server";

import { EraseOwnMessages } from "./erase-own-messages";
import { GuildIcon } from "./guild-icon";

const ReadableGuildRow = ({ guild }: Readonly<{ guild: ReadableGuild }>): ReactNode => (
  <li className="border-dc-line flex flex-col gap-3 rounded-2xl border px-4 py-3">
    <div className="flex items-center gap-4">
      <GuildIcon guildId={guild.id} name={guild.name} icon={guild.icon} />
      <span className="font-bold">{guild.name}</span>
    </div>
    <EraseOwnMessages guildId={guild.id} />
  </li>
);

export { ReadableGuildRow };
