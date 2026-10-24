import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import type { ReadableGuild } from "#/pages/dashboard/api/dashboard.server";

import { ReadableGuildRow } from "./readable-guild-row";

const ReadableGuildList = ({
  guilds,
}: Readonly<{ guilds: readonly ReadableGuild[] }>): ReactNode => (
  <ul className="grid items-start gap-3 sm:grid-cols-2">
    {pipe(
      guilds,
      Array.map((guild) => <ReadableGuildRow key={guild.id} guild={guild} />),
    )}
  </ul>
);

export { ReadableGuildList };
