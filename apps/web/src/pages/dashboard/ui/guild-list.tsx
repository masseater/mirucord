import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import type { ManagedGuild } from "#/features/ingest/index.server";
import { MASCOT_NAME } from "#/shared/config";
import { Panel } from "#/shared/ui/panel";
import { popButtonVariants } from "#/shared/ui/pop-variants";

import { GuildCard } from "./guild-card";

const TITLE = "あなたが管理しているサーバー";
const INVITE = `${MASCOT_NAME}をサーバーに招待`;

const GuildList = ({
  guilds,
  inviteUrl,
}: Readonly<{ guilds: readonly ManagedGuild[]; inviteUrl: string }>): ReactNode => (
  <Panel>
    <h2 className="text-dc-bright font-maru text-xl font-black">{TITLE}</h2>
    <ul className="grid gap-4 sm:grid-cols-2">
      {pipe(
        guilds,
        Array.map((guild) => <GuildCard key={guild.id} guild={guild} />),
      )}
    </ul>
    <a href={inviteUrl} className={popButtonVariants({ tone: "secondary", size: "md" })}>
      {INVITE}
    </a>
  </Panel>
);

export { GuildList };
