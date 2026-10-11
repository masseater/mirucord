import type { ReactNode } from "react";

import type { GuildSettings } from "#/features/ingest/index.server";

import { IngestStatus } from "./ingest-status";
import { RevokePanel } from "./revoke-panel";
import { SharePanel } from "./share-panel";

const GrantedPanels = ({ settings }: Readonly<{ settings: GuildSettings }>): ReactNode => (
  <>
    <SharePanel />
    <IngestStatus settings={settings} />
    <RevokePanel guildId={settings.id} />
  </>
);

export { GrantedPanels };
