import { Array } from "effect";
import type { ReactNode } from "react";

import type { ReadableGuild } from "#/pages/dashboard/api/dashboard.server";
import { MASCOT_NAME } from "#/shared/config";

import { ReadableGuildRow } from "./readable-guild-row";

const EMPTY = `${MASCOT_NAME}がさがせるサーバーはまだありません。`;

const ReadableGuildList = ({
  guilds,
}: Readonly<{ guilds: readonly ReadableGuild[] }>): ReactNode => (
  <>
    {Array.isReadonlyArrayEmpty(guilds) && <p className="text-dc-muted">{EMPTY}</p>}
    <ul className="grid items-start gap-3 sm:grid-cols-2">
      {guilds.map((guild) => (
        <ReadableGuildRow key={guild.id} guild={guild} />
      ))}
    </ul>
  </>
);

export { ReadableGuildList };
