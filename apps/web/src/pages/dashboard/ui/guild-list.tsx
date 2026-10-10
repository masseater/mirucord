import { Array } from "effect";
import type { ReactNode } from "react";

import type { ManagedGuild } from "#/features/ingest/index.server";
import { MascotTip } from "#/shared/ui/mascot-tip";
import { PopLink } from "#/shared/ui/pop-link";

import { GuildCard } from "./guild-card";

const TIP =
  "Bot を入れただけでは過去ログは読みません。サーバーを選んで、説明を読んでから同意してね。";
const TITLE = "あなたが管理しているサーバー";
const EMPTY = "mirucord の Bot が入っていて、あなたが管理権限を持つサーバーはまだありません。";
const INVITE = "Bot をサーバーに招待する";

const GuildList = ({
  guilds,
  inviteUrl,
}: Readonly<{ guilds: readonly ManagedGuild[]; inviteUrl: string }>): ReactNode => (
  <>
    <MascotTip>{TIP}</MascotTip>
    <h1 className="text-3xl font-black">{TITLE}</h1>
    {Array.isReadonlyArrayEmpty(guilds) && <p className="text-ink-soft">{EMPTY}</p>}
    <ul className="flex flex-col gap-4">
      {guilds.map((guild) => (
        <GuildCard key={guild.id} guild={guild} />
      ))}
    </ul>
    <PopLink href={inviteUrl} tone="milk">
      {INVITE}
    </PopLink>
  </>
);

export { GuildList };
