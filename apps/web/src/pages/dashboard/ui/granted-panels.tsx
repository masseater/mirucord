import type { ReactNode } from "react";

import type { GuildSettings } from "#/features/ingest-messages/index.server";

import { IngestStatus } from "./ingest-status.tsx";
import { McpUrlPanel } from "./mcp-url-panel.tsx";
import { RevokePanel } from "./revoke-panel.tsx";

const SHARE_TITLE = "メンバーに URL を共有";

export const GrantedPanels = ({ settings }: Readonly<{ settings: GuildSettings }>): ReactNode => (
  <>
    <McpUrlPanel title={SHARE_TITLE} />
    <IngestStatus settings={settings} />
    <RevokePanel guildId={settings.id} />
  </>
);
