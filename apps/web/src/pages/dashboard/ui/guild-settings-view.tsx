import type { ReactNode } from "react";

import type { GuildSettings } from "#/features/ingest/index.server";

import { ConsentExplainer } from "./consent-explainer";
import { ConsentForm } from "./consent-form";
import { ConsentRecord } from "./consent-record";
import { IngestStatus } from "./ingest-status";
import { RevokePanel } from "./revoke-panel";

const GuildSettingsView = ({ settings }: Readonly<{ settings: GuildSettings }>): ReactNode => (
  <>
    <h1 className="text-2xl font-bold">{settings.name}</h1>
    <ConsentRecord consent={settings.consent} />
    <ConsentExplainer />
    <ConsentForm settings={settings} />
    {settings.consent.status === "granted" && (
      <IngestStatus channels={settings.channels} storedMessages={settings.storedMessages} />
    )}
    {settings.consent.status === "granted" && <RevokePanel guildId={settings.id} />}
  </>
);

export { GuildSettingsView };
