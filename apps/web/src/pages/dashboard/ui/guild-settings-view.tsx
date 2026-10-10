import type { ReactNode } from "react";

import type { GuildSettings } from "#/features/ingest/index.server";
import { MascotTip } from "#/shared/ui/mascot-tip";

import { ConsentExplainer } from "./consent-explainer";
import { ConsentForm } from "./consent-form";
import { ConsentRecord } from "./consent-record";
import { IngestStatus } from "./ingest-status";
import { RevokePanel } from "./revoke-panel";

const TIP = {
  awaiting: "まだ何も読んでいません。下の説明を読んで、読んでいいチャンネルを選んでね。",
  granted: "選んでもらったチャンネルを読んでいます。範囲はいつでも変えられます。",
} as const;

const GuildSettingsView = ({ settings }: Readonly<{ settings: GuildSettings }>): ReactNode => (
  <>
    <MascotTip>{TIP[settings.consent.status]}</MascotTip>
    <h1 className="text-3xl font-black">{settings.name}</h1>
    <ConsentRecord consent={settings.consent} />
    <ConsentExplainer />
    <ConsentForm settings={settings} />
    {settings.consent.status === "granted" && (
      <IngestStatus
        guildId={settings.id}
        channels={settings.channels}
        storedMessages={settings.storedMessages}
      />
    )}
    {settings.consent.status === "granted" && <RevokePanel guildId={settings.id} />}
  </>
);

export { GuildSettingsView };
