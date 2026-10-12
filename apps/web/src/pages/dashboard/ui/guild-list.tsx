import { Array } from "effect";
import type { ReactNode } from "react";

import type { ManagedGuild } from "#/features/ingest/index.server";
import { MASCOT_NAME } from "#/shared/config";
import { Panel } from "#/shared/ui/panel";
import { popButtonVariants } from "#/shared/ui/pop-variants";

import { GuildCard } from "./guild-card";

const TITLE = "あなたが管理しているサーバー";
const EMPTY = `${MASCOT_NAME}が入っていて、あなたが管理権限を持つサーバーはまだありません。`;
const INVITE = "Bot をサーバーに招待する";

const GuildList = ({
  guilds,
  inviteUrl,
}: Readonly<{ guilds: readonly ManagedGuild[]; inviteUrl: string }>): ReactNode => (
  <Panel>
    <h2 className="text-dc-bright font-maru text-xl font-black">{TITLE}</h2>
    {Array.isReadonlyArrayEmpty(guilds) && <p className="text-dc-muted">{EMPTY}</p>}
    <ul className="flex flex-col gap-4">
      {guilds.map((guild) => (
        <GuildCard key={guild.id} guild={guild} />
      ))}
    </ul>
    <a href={inviteUrl} className={popButtonVariants({ tone: "secondary", size: "md" })}>
      {INVITE}
    </a>
  </Panel>
);

export { GuildList };
