import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import type { ManagedGuild } from "#/features/ingest/index.server";

import { WaitingGuildLink } from "./waiting-guild-link";

const WaitingGuildLinks = ({
  guilds,
}: Readonly<{ guilds: readonly ManagedGuild[] }>): ReactNode => (
  <ul className="flex flex-wrap gap-2">
    {pipe(
      guilds,
      Array.map((guild) => <WaitingGuildLink key={guild.id} guild={guild} />),
    )}
  </ul>
);

export { WaitingGuildLinks };
