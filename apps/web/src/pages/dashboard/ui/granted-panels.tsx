import type { ReactNode } from "react";

import type { GuildSettings } from "#/features/ingest/index.server";
import { MASCOT_NAME } from "#/shared/config";

import { IngestStatus } from "./ingest-status";
import { McpUrlPanel } from "./mcp-url-panel";
import { RevokePanel } from "./revoke-panel";

const SHARE_TITLE = "みんなに使ってもらうには";
const SHARE_NOTE = `サーバーのメンバーにこの URL を伝えて、それぞれのアプリにコネクタとして登録してもらってね。登録した人は、自分が Discord で見られるチャンネルを${MASCOT_NAME}にさがしてもらえます。`;

const GrantedPanels = ({ settings }: Readonly<{ settings: GuildSettings }>): ReactNode => (
  <>
    <McpUrlPanel title={SHARE_TITLE} note={SHARE_NOTE} />
    <IngestStatus settings={settings} />
    <RevokePanel guildId={settings.id} />
  </>
);

export { GrantedPanels };
