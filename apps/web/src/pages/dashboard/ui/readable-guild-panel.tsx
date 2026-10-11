import type { ReactNode } from "react";

import type { GuildListing } from "#/pages/dashboard/api/dashboard.server";
import { MASCOT_NAME } from "#/shared/config";
import { Panel } from "#/shared/ui/panel";

import { ReadableGuildList } from "./readable-guild-list";

const TITLE = `${MASCOT_NAME}がさがせるサーバー`;
const UNAVAILABLE = "サーバーを確かめられませんでした。時間をおいて開き直してください。";

const ReadableGuildPanel = ({ listing }: Readonly<{ listing: GuildListing }>): ReactNode => (
  <Panel>
    <h2 className="text-dc-bright font-maru text-xl font-black">{TITLE}</h2>
    {listing.status === "unavailable" && <p className="text-dc-muted">{UNAVAILABLE}</p>}
    {listing.status === "ready" && <ReadableGuildList guilds={listing.guilds} />}
  </Panel>
);

export { ReadableGuildPanel };
