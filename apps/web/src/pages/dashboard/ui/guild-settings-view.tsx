import { useMemo } from "react";
import type { ReactNode } from "react";

import type { GuildSettings } from "#/features/ingest/index.server";
import { MascotTip } from "#/shared/ui/mascot-tip";

import { ConsentForm } from "./consent-form";
import { ConsentRecord } from "./consent-record";
import { IngestStatus } from "./ingest-status";
import { RefreshButton } from "./refresh-button";
import { RevokePanel } from "./revoke-panel";

const TIP = {
  awaiting: "よければ同意してね",
  granted: "思い出を集めてるよ",
} as const;

const GuildSettingsView = ({ settings }: Readonly<{ settings: GuildSettings }>): ReactNode => {
  const target = useMemo(() => ({ scope: "guild", guildId: settings.id }) as const, [settings.id]);
  return (
    <>
      <MascotTip>{TIP[settings.consent.status]}</MascotTip>
      <h1 className="text-3xl font-black">{settings.name}</h1>
      <RefreshButton target={target} />
      <ConsentRecord consent={settings.consent} />
      {settings.consent.status === "awaiting" && <ConsentForm settings={settings} />}
      {settings.consent.status === "granted" && <IngestStatus settings={settings} />}
      {settings.consent.status === "granted" && <RevokePanel guildId={settings.id} />}
    </>
  );
};

export { GuildSettingsView };
