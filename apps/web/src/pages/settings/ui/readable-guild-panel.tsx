import type { ReactNode } from "react";

import type { GuildListing } from "#/pages/settings/api/settings.server";
import { Panel } from "#/shared/ui/panel";

import { ReadableGuildList } from "./readable-guild-list";

const TITLE = "ミルがさがせるサーバー";
const UNAVAILABLE = "サーバーを確かめられませんでした。時間をおいて開き直してください。";

const ReadableGuildPanel = ({ listing }: Readonly<{ listing: GuildListing }>): ReactNode => (
  <Panel>
    <h2 className="text-xl font-black">{TITLE}</h2>
    {listing.status === "unavailable" && <p className="text-ink-soft">{UNAVAILABLE}</p>}
    {listing.status === "ready" && <ReadableGuildList guilds={listing.guilds} />}
  </Panel>
);

export { ReadableGuildPanel };
