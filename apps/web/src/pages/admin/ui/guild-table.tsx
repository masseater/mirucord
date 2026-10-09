import type { ReactNode } from "react";

import type { AdminGuild } from "#/pages/admin/api/overview.server";

import { GuildRow } from "./guild-row";
import { GuildTableHead } from "./guild-table-head";

const GuildTable = ({ guilds }: Readonly<{ guilds: readonly AdminGuild[] }>): ReactNode => (
  <table className="w-full text-sm">
    <GuildTableHead />
    <tbody>
      {guilds.map((guild) => (
        <GuildRow key={guild.id} guild={guild} />
      ))}
    </tbody>
  </table>
);

export { GuildTable };
