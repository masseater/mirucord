import { Array } from "effect";
import type { ReactNode } from "react";

import type { ManagedGuild } from "#/features/ingest/index.server";

import { GuildCard } from "./guild-card";

const TITLE = "あなたが管理しているサーバー";
const LEAD =
  "Bot を入れただけでは過去ログを読みません。サーバーを選んで読み取る範囲を決めて同意すると取り込みが始まります。";
const EMPTY = "mirucord の Bot が入っていて、あなたが管理権限を持つサーバーはまだありません。";
const INVITE = "Bot をサーバーに招待する";

const GuildList = ({
  guilds,
  inviteUrl,
}: Readonly<{ guilds: readonly ManagedGuild[]; inviteUrl: string }>): ReactNode => (
  <section className="flex flex-col gap-6">
    <h1 className="text-2xl font-bold">{TITLE}</h1>
    <p>{LEAD}</p>
    {Array.isReadonlyArrayEmpty(guilds) && <p>{EMPTY}</p>}
    <ul className="flex flex-col gap-3">
      {guilds.map((guild) => (
        <GuildCard key={guild.id} guild={guild} />
      ))}
    </ul>
    <a className="self-start rounded border px-4 py-2" href={inviteUrl}>
      {INVITE}
    </a>
  </section>
);

export { GuildList };
