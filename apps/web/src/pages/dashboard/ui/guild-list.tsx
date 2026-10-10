import { Array } from "effect";
import type { ReactNode } from "react";

import type { ManagedGuild } from "#/features/ingest/index.server";
import { MascotTip } from "#/shared/ui/mascot-tip";

import { GuildCard } from "./guild-card";

const TIP =
  "Bot を入れただけでは過去ログは読みません。サーバーを選んで、読んでいいチャンネルを決めてね。";
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
    <a
      className="border-ink bg-milk shadow-pop-sm inline-flex h-11 items-center self-start rounded-full border-2 px-6 font-bold no-underline motion-safe:transition motion-safe:hover:-translate-y-0.5"
      href={inviteUrl}
    >
      {INVITE}
    </a>
  </>
);

export { GuildList };
