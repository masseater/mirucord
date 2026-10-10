import { Array } from "effect";
import type { ReactNode } from "react";

import type { ManagedGuild } from "#/features/ingest/index.server";
import { MascotTip } from "#/shared/ui/mascot-tip";
import { popButtonVariants } from "#/shared/ui/pop-variants";

import { GuildCard } from "./guild-card";
import { RefreshButton } from "./refresh-button";

const TIP = "サーバーを選んでね";
const TITLE = "あなたが管理しているサーバー";
const EMPTY = "ミルが入っていて、あなたが管理権限を持つサーバーはまだありません。";
const INVITE = "Bot をサーバーに招待する";
const GUILD_LIST = { scope: "guilds" } as const;

const GuildList = ({
  guilds,
  inviteUrl,
}: Readonly<{ guilds: readonly ManagedGuild[]; inviteUrl: string }>): ReactNode => (
  <>
    <MascotTip>{TIP}</MascotTip>
    <h1 className="text-3xl font-black">{TITLE}</h1>
    <RefreshButton target={GUILD_LIST} />
    {Array.isReadonlyArrayEmpty(guilds) && <p className="text-ink-soft">{EMPTY}</p>}
    <ul className="flex flex-col gap-4">
      {guilds.map((guild) => (
        <GuildCard key={guild.id} guild={guild} />
      ))}
    </ul>
    <a href={inviteUrl} className={popButtonVariants({ tone: "milk", size: "md" })}>
      {INVITE}
    </a>
  </>
);

export { GuildList };
