import type { ReactNode } from "react";

import type { ManagedGuild } from "#/features/ingest-messages/index.server";
import { MASCOT_NAME } from "#/shared/config";
import { Panel } from "#/shared/ui/panel";
import { PopButton } from "#/shared/ui/pop-button";

import { GuildCard } from "./guild-card.tsx";
import { GuildItems } from "./guild-items.tsx";

const TITLE = "あなたが管理しているサーバー";
const INVITE = `${MASCOT_NAME}をサーバーに招待`;

export const GuildList = ({
  guilds,
  inviteUrl,
}: Readonly<{ guilds: readonly ManagedGuild[]; inviteUrl: string }>): ReactNode => (
  <Panel>
    <h2 className="text-dc-bright font-maru text-xl font-black">{TITLE}</h2>
    <GuildItems guilds={guilds} className="grid gap-4 sm:grid-cols-2" item={GuildCard} />
    <PopButton href={inviteUrl} tone="secondary">
      {INVITE}
    </PopButton>
  </Panel>
);
