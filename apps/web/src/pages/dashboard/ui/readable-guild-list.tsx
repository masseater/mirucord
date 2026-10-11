import { Array } from "effect";
import type { ReactNode } from "react";

import type { ReadableGuild } from "#/pages/dashboard/api/dashboard.server";

import { ReadableGuildRow } from "./readable-guild-row";

const EMPTY = "ミルがさがせるサーバーはまだありません。";

const ReadableGuildList = ({
  guilds,
}: Readonly<{ guilds: readonly ReadableGuild[] }>): ReactNode => (
  <>
    {Array.isReadonlyArrayEmpty(guilds) && <p className="text-dc-muted">{EMPTY}</p>}
    <ul className="flex flex-col gap-3">
      {guilds.map((guild) => (
        <ReadableGuildRow key={guild.id} guild={guild} />
      ))}
    </ul>
  </>
);

export { ReadableGuildList };
