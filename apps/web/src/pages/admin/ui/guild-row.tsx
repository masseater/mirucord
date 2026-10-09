import type { ReactNode } from "react";

import type { AdminGuild } from "#/pages/admin/api/overview.server";

const GuildRow = ({ guild }: Readonly<{ guild: AdminGuild }>): ReactNode => (
  <tr className="border-t">
    <td className="p-2">{guild.name}</td>
    <td className="p-2">{guild.joinedAt}</td>
    <td className="p-2 text-right">{guild.channels}</td>
    <td className="p-2 text-right">{guild.backfilled}</td>
    <td className="p-2 text-right">{guild.messages}</td>
  </tr>
);

export { GuildRow };
