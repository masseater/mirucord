import type { ReactNode } from "react";

import type { GuildSettings } from "#/features/ingest/index.server";

import { IngestStatus } from "./ingest-status";
import { McpUrlPanel } from "./mcp-url-panel";
import { RevokePanel } from "./revoke-panel";

const SHARE_TITLE = "メンバーに URL を共有";

const GrantedPanels = ({ settings }: Readonly<{ settings: GuildSettings }>): ReactNode => (
  <>
    <McpUrlPanel title={SHARE_TITLE} />
    <IngestStatus settings={settings} />
    <RevokePanel guildId={settings.id} />
  </>
);

export { GrantedPanels };
