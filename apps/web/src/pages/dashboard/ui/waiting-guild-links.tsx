import type { ReactNode } from "react";

import type { ManagedGuild } from "#/features/ingest/index.server";
import { MASCOT_NAME } from "#/shared/config";

import { WaitingGuildLink } from "./waiting-guild-link";

const NOTE = `同意するまで、${MASCOT_NAME}はサーバーのメッセージを読みません。`;

const WaitingGuildLinks = ({
  guilds,
}: Readonly<{ guilds: readonly ManagedGuild[] }>): ReactNode => (
  <>
    <p className="text-dc-muted text-sm">{NOTE}</p>
    <ul className="flex flex-wrap gap-2">
      {guilds.map((guild) => (
        <WaitingGuildLink key={guild.id} guild={guild} />
      ))}
    </ul>
  </>
);

export { WaitingGuildLinks };
